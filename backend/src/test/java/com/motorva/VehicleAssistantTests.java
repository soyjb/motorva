package com.motorva;

import java.util.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import org.springframework.web.server.ResponseStatusException;

class VehicleAssistantTests {
    private final ObjectMapper mapper = new ObjectMapper().findAndRegisterModules();
    @Test void routineQuestionsAreNotBlockedAndSafetyDoesNotPoisonNewTopics() {
        for (String question : List.of("When were my brakes changed?", "What do brake pads do?", "What tire maintenance is recorded?", "How do airbags work?", "Explain overheating prevention", "What does a fuel filter do?"))
            assertFalse(VehicleAssistantService.safetyConcern(question), question);
        for (String question : List.of("My brakes failed", "My brakes don't work", "My steering is stuck", "My tire is bulging", "My engine is overheating", "There is smoke coming from the hood", "I have a fuel leak", "Is it safe to drive?"))
            assertTrue(VehicleAssistantService.safetyConcern(question), question);
        var history = List.of(new VehicleAssistantService.Message("assistant", "This conversation may involve a safety-critical vehicle issue. See a mechanic."));
        assertTrue(VehicleAssistantService.safetyFollowUp("How do I fix it?", history));
        assertFalse(VehicleAssistantService.safetyFollowUp("What oil service is recorded?", history));
        assertFalse(VehicleAssistantService.safetyFollowUp("Explain tire rotation", history));
    }
    @Test void followUpsUseOnlyRecentSavedMessagesAndFailedAnswersDoNotSave() throws Exception {
        var repository = mock(AccountVehicleRepository.class);
        var conversations = mock(AssistantConversationRepository.class);
        var client = mock(OpenAiVehicleClient.class);
        UUID owner = UUID.randomUUID(), id = UUID.randomUUID();
        var vehicle = new AccountVehicle(owner, id);
        vehicle.payload("{\"id\":\""+id+"\",\"year\":2024,\"make\":\"Toyota\",\"model\":\"Camry\",\"mileage\":24000}");
        var conversation = new AssistantConversation(vehicle.id());
        var prior = new ArrayList<VehicleAssistantService.Message>();
        for (int i=0; i<6; i++) { prior.add(new VehicleAssistantService.Message("user", "Question "+i)); prior.add(new VehicleAssistantService.Message("assistant", "Answer "+i)); }
        conversation.transcript = mapper.writeValueAsString(prior);
        when(repository.findByOwnerIdAndVehicleId(owner,id)).thenReturn(Optional.of(vehicle));
        when(conversations.findById(vehicle.id())).thenReturn(Optional.of(conversation));
        when(client.configured()).thenReturn(true);
        when(client.answer(anyString(),anyString(),anyList())).thenReturn("Follow-up answer");
        var service = new VehicleAssistantService(repository,mapper,client,conversations);
        assertEquals("Follow-up answer", service.ask(owner,id,"Explain that again"));
        verify(client).answer(anyString(),eq("Explain that again"),eq(prior.subList(4,12)));
        assertEquals(14, service.history(owner,id).size());
        verify(conversations).saveAndFlush(conversation);
        clearInvocations(conversations);
        when(client.answer(anyString(),anyString(),anyList())).thenThrow(new ResponseStatusException(org.springframework.http.HttpStatus.BAD_GATEWAY));
        assertThrows(ResponseStatusException.class,()->service.ask(owner,id,"One more question"));
        verify(conversations,never()).saveAndFlush(any());
        assertEquals(14, service.history(owner,id).size());
    }
    @Test void providerErrorsDistinguishAuthenticationPermissionsAndLimits() {
        assertTrue(OpenAiVehicleClient.providerError(401).getReason().contains("rejected the API key"));
        assertTrue(OpenAiVehicleClient.providerError(403).getReason().contains("denied access"));
        assertTrue(OpenAiVehicleClient.providerError(404).getReason().contains("configured model"));
        assertEquals(429, OpenAiVehicleClient.providerError(429).getStatusCode().value());
        assertTrue(OpenAiVehicleClient.providerError(400).getReason().contains("request settings"));
        assertTrue(OpenAiVehicleClient.providerError(503).getReason().contains("HTTP 503"));
    }
    @Test void otherAccountsCannotUseVehicleContextOrSpendCredits() {
        var repository = mock(AccountVehicleRepository.class);
        var client = mock(OpenAiVehicleClient.class);
        UUID owner = UUID.randomUUID(), vehicle = UUID.randomUUID();
        when(repository.findByOwnerIdAndVehicleId(owner, vehicle)).thenReturn(Optional.empty());
        var service = new VehicleAssistantService(repository, mapper, client, mock(AssistantConversationRepository.class));
        assertEquals(404, assertThrows(ResponseStatusException.class, () -> service.ask(owner, vehicle, "What services are recorded?")).getStatusCode().value());
        verifyNoInteractions(client);
    }
    @Test void safetyRulesBypassAiAndDailyLimitStopsAdditionalRequests() {
        var repository = mock(AccountVehicleRepository.class);
        var client = mock(OpenAiVehicleClient.class);
        UUID owner = UUID.randomUUID(), id = UUID.randomUUID();
        var entity = new AccountVehicle(owner,id);
        entity.payload("{\"id\":\""+id+"\",\"year\":2024,\"make\":\"Toyota\",\"model\":\"Camry\",\"mileage\":24000}");
        when(repository.findByOwnerIdAndVehicleId(owner,id)).thenReturn(Optional.of(entity));
        when(client.configured()).thenReturn(true);
        when(client.answer(anyString(),anyString(),anyList())).thenReturn("Recorded maintenance summary");
        var service = new VehicleAssistantService(repository,mapper,client, mock(AssistantConversationRepository.class));
        assertTrue(service.ask(owner,id,"My brakes don't work").contains("qualified mechanic"));
        verify(client,never()).answer(anyString(),anyString(),anyList());
        for (int i=0;i<10;i++) assertEquals("Recorded maintenance summary",service.ask(owner,id,"What services are recorded?"));
        assertEquals(429,assertThrows(ResponseStatusException.class,()->service.ask(owner,id,"Explain mileage")).getStatusCode().value());
        verify(client,times(10)).answer(anyString(),anyString(),anyList());
    }
    @Test void contextExcludesPhotosAndPrivateNotesAndParsesRawResponses() throws Exception {
        UUID id = UUID.randomUUID(), serviceId = UUID.randomUUID();
        var vehicle = mapper.readValue("{\"id\":\""+id+"\",\"year\":2024,\"make\":\"Toyota\",\"model\":\"Camry\",\"mileage\":24000,\"photo\":\"private-image\",\"services\":[{\"id\":\""+serviceId+"\",\"title\":\"Oil change\",\"date\":\"2026-01-01\",\"mileage\":22000,\"notes\":\"private-note\"}]}",VehiclePayload.class);
        String context = VehicleAssistantService.context(vehicle);
        assertTrue(context.contains("Oil change")); assertFalse(context.contains("private-image")); assertFalse(context.contains("private-note"));
        assertEquals("A useful answer",OpenAiVehicleClient.extract(mapper.readTree("{\"output\":[{\"type\":\"message\",\"content\":[{\"type\":\"output_text\",\"text\":\"A useful answer\"}]}]}")));
        assertThrows(ResponseStatusException.class,()->OpenAiVehicleClient.extract(mapper.readTree("{\"output\":[]}")));
    }
}

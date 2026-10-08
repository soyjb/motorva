package com.motorva;

import java.time.LocalDate;
import java.util.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@Service
public class VehicleAssistantService {
    private final AccountVehicleRepository repository;
    private final ObjectMapper mapper;
    private final OpenAiVehicleClient client;
    private final AssistantConversationRepository conversations;
    public record Message(String role, String text) {}
    private LocalDate day = LocalDate.now();
    private int requests;
    private final Map<UUID,Integer> perUser = new HashMap<>();
    VehicleAssistantService(AccountVehicleRepository repository, ObjectMapper mapper, OpenAiVehicleClient client, AssistantConversationRepository conversations) {
        this.repository = repository; this.mapper = mapper; this.client = client;
        this.conversations = conversations;
    }
    private AccountVehicle owned(UUID owner, UUID id) {
        return repository.findByOwnerIdAndVehicleId(owner, id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }
    private List<Message> messages(AssistantConversation conversation) {
        try { return new ArrayList<>(mapper.readValue(conversation.transcript, mapper.getTypeFactory().constructCollectionType(List.class, Message.class))); }
        catch (com.fasterxml.jackson.core.JsonProcessingException exception) { throw new IllegalStateException("Invalid stored conversation", exception); }
    }
    public List<Message> history(UUID owner, UUID id) {
        var vehicle = owned(owner, id);
        return conversations.findById(vehicle.id()).map(this::messages).orElseGet(List::of);
    }
    public void clear(UUID owner, UUID id) {
        var vehicle = owned(owner, id);
        conversations.findById(vehicle.id()).ifPresent(conversation -> {
            conversation.transcript = "[]"; conversations.saveAndFlush(conversation);
        });
    }
    public String ask(UUID owner, UUID id, String question) {
        AccountVehicle entity = owned(owner, id);
        var conversation = conversations.findById(entity.id()).orElseGet(() -> new AssistantConversation(entity.id()));
        var history = messages(conversation);
        if (history.size() >= 200) throw new ResponseStatusException(HttpStatus.CONFLICT, "This conversation is full. Clear it to start a new one.");
        try {
            VehiclePayload vehicle = mapper.readValue(entity.payload(), VehiclePayload.class);
            String answer;
            if (safetyConcern(question) || safetyFollowUp(question, history)) {
                answer = VehicleSafetyGuidance.answer(question, history);
            } else {
                if (!client.configured()) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "The assistant isn't configured yet.");
                reserve(owner);
                answer = client.answer(context(vehicle), question.strip(), List.copyOf(history.subList(Math.max(0, history.size()-8), history.size())));
            }
            history.add(new Message("user", question.strip()));
            history.add(new Message("assistant", answer));
            conversation.transcript = mapper.writeValueAsString(history);
            conversations.saveAndFlush(conversation);
            return answer;
        } catch (com.fasterxml.jackson.core.JsonProcessingException exception) { throw new IllegalStateException("Invalid stored vehicle", exception); }
    }
    private synchronized void reserve(UUID owner) {
        if (!day.equals(LocalDate.now())) { day = LocalDate.now(); requests = 0; perUser.clear(); }
        if (requests >= 100 || perUser.getOrDefault(owner,0) >= 10)
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Prototype daily question limit reached. Try again tomorrow.");
        requests++; perUser.merge(owner,1,Integer::sum);
    }
    static boolean safetyConcern(String question) {
        String text = question.toLowerCase(Locale.ROOT).replace('’', '\'');
        if (text.matches("(?s).*\\b(safe to drive|can i drive|can i still drive|fuel leak|gas leak|petrol leak|leaking fuel|leaking gas|leaking petrol|smell of gas|smells like gas|smell of petrol|smells like petrol|on fire|flames|smoking|smoke coming|smoke from|blowout|exposed cords|airbag warning|air bag warning|airbag light|srs warning|temperature warning)\\b.*")) return true;
        if (text.matches("(?s).*\\b(is|keeps|engine|car|vehicle)\\s+overheating\\b.*")) return true;
        boolean system = text.matches("(?s).*\\b(brakes?|braking|steering|tires?|tyres?|airbags?)\\b.*");
        boolean symptom = text.matches("(?s).*\\b(failed|failure|don't work|do not work|not working|stopped working|won't work|can't stop|cannot stop|lost|leak|leaking|grinding|scraping|squealing|shaking|vibrating|bulge|bulging|flat|warning|loose|stuck|locked|soft|spongy|sinking|weak|floor|heavy|stiff|unpredictable)\\b.*");
        return system && symptom;
    }
    static boolean safetyFollowUp(String question, List<Message> history) {
        if (history.isEmpty()) return false;
        Message last = history.get(history.size()-1);
        boolean warning = last.role().equals("assistant") && (last.text().startsWith("Safety guidance:") || last.text().startsWith("This conversation may involve a safety-critical vehicle issue."));
        String text = question.toLowerCase(Locale.ROOT).strip();
        return warning && text.matches("(?s).*(\\b(it|that|this|still|anyway|fix|repair|drive)\\b).*" )
            && !text.matches("(?s).*(\\b(history|recorded|records|services|maintenance|oil|filter|mileage|reminders?)\\b).*" );
    }
    static String context(VehiclePayload vehicle) {
        StringBuilder text = new StringBuilder("Today: " + LocalDate.now() + "\nVehicle: " + vehicle.year() + " " + vehicle.make() + " " + vehicle.model() + "\nOdometer: " + vehicle.mileage() + " miles\n");
        text.append("Most recent recorded services (up to 12; other records may exist):\n");
        if (vehicle.services() != null) vehicle.services().stream().sorted(Comparator.comparing(VehiclePayload.Service::date).reversed()).limit(12)
            .forEach(item -> text.append(item.date()).append(" | ").append(item.title()).append(" | ").append(item.mileage()).append(" miles\n"));
        text.append("Recorded incomplete reminders (up to 12; other records may exist):\n");
        if (vehicle.reminders() != null) vehicle.reminders().stream().filter(item -> item.completedDate() == null).limit(12)
            .forEach(item -> text.append(item.title()).append(" | due date: ").append(item.dueDate()).append(" | due mileage: ").append(item.dueMileage()).append("\n"));
        return text.toString();
    }
}

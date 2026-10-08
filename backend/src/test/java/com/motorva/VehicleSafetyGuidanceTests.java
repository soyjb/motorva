package com.motorva;

import java.util.List;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class VehicleSafetyGuidanceTests {
    private String answer(String question) {
        assertTrue(VehicleAssistantService.safetyConcern(question), question);
        return VehicleSafetyGuidance.answer(question, List.of());
    }
    @Test void brakeSymptomsGetDifferentExplanationsAndNextSteps() {
        String grinding = answer("My brakes are grinding");
        assertTrue(grinding.contains("worn pad material"));
        assertTrue(grinding.contains("tow"));
        assertTrue(grinding.contains("Don't test-drive"));
        String soft = answer("My brake pedal is soft");
        assertTrue(soft.contains("hydraulic system"));
        assertTrue(soft.contains("tow"));
        String squealing = answer("My brakes are squealing");
        assertTrue(squealing.contains("prompt brake inspection"));
        assertTrue(squealing.contains("If stopping is weaker"));
        assertFalse(squealing.contains("worn pad material"));
    }
    @Test void urgentSymptomsProvideConcreteActionsWithoutRepairInstructions() {
        String tire = answer("My tire is bulging");
        assertTrue(tire.contains("Stop using"));
        assertTrue(tire.contains("nhtsa.gov"));
        assertTrue(answer("My tire pressure warning is on").contains("owner's manual"));
        assertTrue(answer("My steering is stuck").contains("arrange recovery"));
        assertTrue(answer("My engine is overheating").contains("Don't remove the radiator"));
        assertTrue(answer("There is a fuel leak").contains("don't start or drive"));
        assertTrue(answer("My airbag light is on").contains("Don't disconnect"));
        String fire = answer("My car is on fire and my brakes failed");
        assertTrue(fire.contains("100 feet"));
        assertTrue(fire.contains("911"));
        assertTrue(fire.contains("Don't open the hood"));
        assertFalse(fire.contains("Brake symptoms"));
        assertTrue(answer("Smoke coming from the hood").contains("Don't open the hood"));
    }
    @Test void followUpsRememberTheSymptomAndNewTopicsDoNotInheritIt() {
        String original = answer("My brakes are grinding");
        var history = List.of(new VehicleAssistantService.Message("user", "My brakes are grinding"),
            new VehicleAssistantService.Message("assistant", original),
            new VehicleAssistantService.Message("user", "Can I drive it?"),
            new VehicleAssistantService.Message("assistant", original));
        assertTrue(VehicleAssistantService.safetyFollowUp("How do I fix it?", history));
        assertTrue(VehicleSafetyGuidance.answer("How do I fix it?", history).contains("worn pad material"));
        assertFalse(VehicleAssistantService.safetyFollowUp("What oil services are recorded?", history));
        String newTopic = VehicleSafetyGuidance.answer("My tire is flat, can I fix it?", history);
        assertTrue(newTopic.contains("Tire symptoms"));
        assertFalse(newTopic.contains("Brake symptoms"));
        String unknown = answer("Is it safe to drive?");
        assertTrue(unknown.contains("What symptom or warning"));
    }
}

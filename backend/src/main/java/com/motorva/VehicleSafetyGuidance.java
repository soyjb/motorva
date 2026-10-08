package com.motorva;

import java.util.List;
import java.util.Locale;

/** Reviewed general guidance, not a diagnosis or a complete symptom classifier. */
final class VehicleSafetyGuidance {
    private VehicleSafetyGuidance() {}
    static String normalize(String text) { return text.toLowerCase(Locale.ROOT).replace('’', '\''); }
    static boolean has(String text, String pattern) { return text.matches("(?s).*\\b(" + pattern + ")\\b.*"); }
    static String answer(String question, List<VehicleAssistantService.Message> history) {
        String text = normalize(question);
        // A vague follow-up uses the last unresolved safety topic, not every past topic.
        String topics = "brakes?|braking|steering|tires?|tyres?|airbags?|air bag|srs|fuel|gas|petrol|smoke|smoking|fire|flames|overheating|temperature|blowout|exposed cords";
        if (VehicleAssistantService.safetyFollowUp(question, history) && !has(text, topics)) {
            for (int index = history.size()-1; index >= 0; index--) {
                var message = history.get(index);
                if (message.role().equals("user") && VehicleAssistantService.safetyConcern(message.text()) && has(normalize(message.text()), topics)) {
                    text = normalize(message.text()) + " " + text;
                    break;
                }
            }
        }
        if (has(text, "on fire|flames|burning vehicle")) return reply(
            "Vehicle fire: act immediately",
            "When safe, stop and switch off the engine. Get everyone out, move at least 100 feet away and clear of traffic, and call your local emergency number (911 in the US). Don't open the hood or trunk, return to the vehicle, or try to fight the fire.",
            "Mechanical or electrical faults can cause vehicle fires; the cause can wait until everyone is safe.",
            "Are you and your passengers away from the vehicle? Don't delay getting help to reply.",
            "https://www.usfa.fema.gov/prevention/vehicle-fires/");
        if (has(text, "fuel leak|gas leak|petrol leak|leaking fuel|leaking gas|leaking petrol|smell of gas|smells like gas|smell of petrol|smells like petrol")) return reply(
            "Suspected fuel leak: don't start or drive the vehicle",
            "If driving, stop somewhere safe and switch off the engine. Keep away from flames and smoking, and contact roadside assistance for recovery. If there's smoke, fire, or immediate danger, move away and call emergency services.",
            "A fuel-system leak is one possibility; a smell alone cannot identify where it comes from. Have a qualified mechanic inspect it.",
            "Was this noticed after refueling, and is fuel visibly dripping? Report only what you already observed; don't approach a suspected leak to investigate.",
            "https://www.theaa.com/breakdown-cover/advice/car-smells-of-petrol");
        if (has(text, "smoking|smoke coming|smoke from")) return reply(
            "Smoke: stop safely and assess from a distance",
            "Stop somewhere safe and switch off the engine. If you suspect fire, get everyone out and away from traffic, keep at least 100 feet away, and call emergency services. Don't open the hood if you suspect a fire.",
            "Smoke or steam can have different causes; its location matters. This message cannot establish the cause.",
            "From what you already noticed, was it under the hood or from the exhaust? Were there flames or a temperature warning? Don't go closer to check.",
            "https://www.usfa.fema.gov/prevention/vehicle-fires/");
        if (has(text, "brakes?|braking|brake pedal")) {
            boolean severe = has(text, "failed|failure|don't work|do not work|not working|stopped working|won't work|can't stop|cannot stop|weak|soft|spongy|sinking|floor|longer to stop");
            boolean grinding = has(text, "grinding|scraping");
            String next = severe || grinding
                ? "Stop somewhere safe if you're driving, and arrange roadside assistance or a tow. Don't continue driving until a qualified mechanic has checked the brakes."
                : "Arrange a prompt brake inspection by a qualified mechanic. If stopping is weaker, the pedal sinks, or you hear grinding, stop safely and arrange a tow.";
            String explanation = severe
                ? "A soft or sinking pedal can involve the brake hydraulic system, such as a leak or air in the system. The symptom alone does not identify the fault."
                : grinding ? "Grinding can mean worn pad material and contact with the brake disc, but an inspection must confirm it."
                : "Noise or vibration can involve worn pads, discs, or other parts; a sound alone isn't enough to identify the cause.";
            return reply("Brake symptoms: inspection needed", next, explanation,
                "What did you notice: grinding, squealing, vibration, or a changed pedal feel? Does it happen only while braking? Don't test-drive to check.",
                "https://www.theaa.com/car-care/advice/servicing/how-to-tell-if-your-brake-pads-or-discs-need-replacing");
        }
        if (has(text, "tires?|tyres?|blowout|exposed cords")) {
            boolean damage = has(text, "bulge|bulging|flat|blowout|exposed cords|cuts|cracks");
            return reply("Tire symptoms: check before further driving",
                damage ? "Stop using a visibly damaged or flat tire. Arrange roadside help or recovery rather than driving on it."
                : "Check the warning against your owner's manual and arrange a tire inspection. If the tire is flat, damaged, or rapidly losing pressure, stop safely and arrange roadside help.",
                damage ? "Bulges, cuts, and other physical damage are reasons to stop using a tire; a tire professional should evaluate replacement."
                : "A pressure warning may indicate low inflation; shaking or other symptoms need inspection rather than a diagnosis from chat.",
                "Is there visible damage or a pressure warning, and which tire is affected? Don't stand in traffic or inspect it while moving.",
                "https://www.nhtsa.gov/vehicle-safety/tires");
        }
        if (has(text, "steering")) return reply("Steering symptoms: urgent inspection",
            "If steering becomes stiff, unpredictable, or difficult to control, stop somewhere safe and arrange recovery. Have a qualified mechanic inspect the system before further driving.",
            "Loss of steering assistance or a steering-system fault can affect control. Hydraulic and electric systems differ, so don't assume adding fluid will fix it.",
            "Was the steering suddenly heavy, loose, or stuck, and was a warning light on? Describe what you noticed without test-driving.",
            "https://www.theaa.com/breakdown-cover/advice/dashboard-warning-lights");
        if (has(text, "overheating|temperature warning|temperature gauge")) return reply("Overheating: stop and let the engine cool",
            "Stop somewhere safe, switch off the engine, and contact roadside assistance. Don't remove the radiator or coolant-reservoir cap while hot, and don't open the hood if steam is escaping.",
            "Cooling-system faults or leaks can cause overheating; continued driving can damage the engine. Cooling down alone doesn't establish that the problem is fixed.",
            "Did you notice a temperature warning, steam, or a visible leak before stopping? Tell roadside assistance what you observed.",
            "https://info.oregon.aaa.com/what-to-do-if-your-car-is-overheating-and-how-to-prevent-it/");
        if (has(text, "airbags?|air bag|srs")) return reply("Airbag warning: arrange a restraint-system inspection",
            "Contact a qualified mechanic promptly and ask about recovery or inspection before further driving. Don't disconnect or work on airbag components yourself.",
            "The warning can indicate a fault in the supplemental restraint system; the airbags may not protect you as intended. It does not identify a particular part to replace.",
            "Is this the main airbag/SRS warning, or the passenger-airbag-off indicator? Did it stay on after startup, or appear after a collision or repair?",
            "https://www.theaa.com/breakdown-cover/advice/dashboard-warning-lights");
        return reply("Driving safety: more detail needed",
            "I can't determine whether driving is safe from this question. If control is impaired, stop somewhere safe and arrange roadside assistance; call emergency services for immediate danger.",
            "The next step depends on the actual symptom and any warning lights.",
            "What symptom or warning prompted your question, and is the vehicle parked? I can explain what to report and which inspection to arrange.", null);
    }
    private static String reply(String title, String next, String explanation, String question, String source) {
        return "Safety guidance: " + title + "\n\n" + next + "\n\nWhat it may mean: " + explanation
            + "\n\n" + question + "\n\nThis is general guidance, not a confirmed diagnosis."
            + (source == null ? "" : "\nSource: " + source);
    }
}

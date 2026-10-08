package com.motorva;

import java.util.UUID;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.ResponseEntity;

@RestController
@RequestMapping("/api/vehicles/{id}/assistant")
public class VehicleAssistantController {
    private final VehicleAssistantService service;
    VehicleAssistantController(VehicleAssistantService service) { this.service = service; }
    record Question(@NotBlank @Size(max=1000) String question) {}
    record Answer(String answer) {}
    @GetMapping
    public java.util.List<VehicleAssistantService.Message> history(@AuthenticationPrincipal Jwt user, @PathVariable UUID id) {
        return service.history(UUID.fromString(user.getSubject()), id);
    }
    @DeleteMapping
    @ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
    public void clear(@AuthenticationPrincipal Jwt user, @PathVariable UUID id) {
        service.clear(UUID.fromString(user.getSubject()), id);
    }
    @ExceptionHandler({org.springframework.dao.OptimisticLockingFailureException.class, org.springframework.dao.DataIntegrityViolationException.class})
    ResponseEntity<Answer> changed() {
        return ResponseEntity.status(409).body(new Answer("The conversation changed in another tab. Reload before trying again."));
    }
    @PostMapping
    public Answer ask(@AuthenticationPrincipal Jwt user, @PathVariable UUID id, @Valid @RequestBody Question input) {
        return new Answer(service.ask(UUID.fromString(user.getSubject()), id, input.question()));
    }
    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<Answer> error(ResponseStatusException exception) {
        return ResponseEntity.status(exception.getStatusCode()).body(new Answer(exception.getReason() == null ? "Vehicle unavailable." : exception.getReason()));
    }
}

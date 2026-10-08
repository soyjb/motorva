package com.motorva;

import java.util.*;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/vehicles")
public class AccountVehicleController {
    private final AccountVehicleService service;
    AccountVehicleController(AccountVehicleService service) { this.service = service; }
    @GetMapping public List<VehiclePayload> list(@AuthenticationPrincipal Jwt user) { return service.list(UUID.fromString(user.getSubject())); }
    @PutMapping("/{id}") public VehiclePayload save(@AuthenticationPrincipal Jwt user, @PathVariable UUID id, @Valid @RequestBody VehiclePayload vehicle) { return service.save(UUID.fromString(user.getSubject()), id, vehicle); }
    @DeleteMapping("/{id}") @ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
    public void remove(@AuthenticationPrincipal Jwt user, @PathVariable UUID id) { service.remove(UUID.fromString(user.getSubject()), id); }
}

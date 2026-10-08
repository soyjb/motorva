package com.motorva;

import java.time.LocalDate;
import java.util.*;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AccountVehicleService {
    private final AccountVehicleRepository repository;
    private final ObjectMapper mapper;
    AccountVehicleService(AccountVehicleRepository repository, ObjectMapper mapper) { this.repository = repository; this.mapper = mapper; }
    @Transactional(readOnly=true)
    public List<VehiclePayload> list(UUID owner) {
        return repository.findAllByOwnerId(owner).stream().map(entity -> {
            try { return mapper.readValue(entity.payload(), VehiclePayload.class); }
            catch (JsonProcessingException exception) { throw new IllegalStateException("Invalid stored vehicle", exception); }
        }).toList();
    }
    @Transactional
    public VehiclePayload save(UUID owner, UUID id, VehiclePayload vehicle) {
        if (!id.equals(vehicle.id()) || vehicle.year() > LocalDate.now().getYear() + 1)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        if (vehicle.services() != null && (vehicle.services().stream().anyMatch(item -> item.date().isBefore(LocalDate.of(1886,1,1))) || vehicle.services().stream().map(VehiclePayload.Service::id).distinct().count() != vehicle.services().size()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        if (vehicle.reminders() != null && (vehicle.reminders().stream().anyMatch(item -> (item.dueDate() == null && item.dueMileage() == null) || (item.dueDate() != null && item.dueDate().isBefore(LocalDate.of(1886,1,1))) || (item.completedDate() != null && item.completedDate().isBefore(LocalDate.of(1886,1,1)))) || vehicle.reminders().stream().map(VehiclePayload.Reminder::id).distinct().count() != vehicle.reminders().size()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        AccountVehicle entity = repository.findByOwnerIdAndVehicleId(owner, id).orElseGet(() -> new AccountVehicle(owner, id));
        try { entity.payload(mapper.writeValueAsString(vehicle)); }
        catch (JsonProcessingException exception) { throw new IllegalStateException(exception); }
        repository.save(entity);
        return vehicle;
    }
    @Transactional
    public void remove(UUID owner, UUID id) {
        AccountVehicle entity = repository.findByOwnerIdAndVehicleId(owner, id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        repository.delete(entity);
    }
}

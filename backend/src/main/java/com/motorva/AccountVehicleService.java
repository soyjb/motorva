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
        return repository.findAllByOwnerIdOrderByPositionAscIdAsc(owner).stream().map(entity -> {
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
        AccountVehicle entity = repository.findByOwnerIdAndVehicleId(owner, id).orElseGet(() -> {
            AccountVehicle added = new AccountVehicle(owner, id);
            added.position(repository.findAllByOwnerId(owner).stream().mapToLong(AccountVehicle::position).max().orElse(-1) + 1);
            return added;
        });
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
    @Transactional
    public void reorder(UUID owner, List<UUID> ids) {
        List<AccountVehicle> vehicles = repository.findAllByOwnerId(owner);
        Set<UUID> requested = new HashSet<>(ids);
        Set<UUID> existing = new HashSet<>(vehicles.stream().map(AccountVehicle::vehicleId).toList());
        if (requested.size() != ids.size() || !requested.equals(existing))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Garage changed. Reload before reordering.");
        Map<UUID, Integer> positions = new HashMap<>();
        for (int i = 0; i < ids.size(); i++) positions.put(ids.get(i), i);
        for (AccountVehicle vehicle : vehicles) vehicle.position(positions.get(vehicle.vehicleId()));
        repository.saveAll(vehicles);
    }
}

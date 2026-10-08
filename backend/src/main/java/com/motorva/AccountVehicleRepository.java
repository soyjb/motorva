package com.motorva;

import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AccountVehicleRepository extends JpaRepository<AccountVehicle, UUID> {
    List<AccountVehicle> findAllByOwnerId(UUID ownerId);
    List<AccountVehicle> findAllByOwnerIdOrderByPositionAscIdAsc(UUID ownerId);
    Optional<AccountVehicle> findByOwnerIdAndVehicleId(UUID ownerId, UUID vehicleId);
}

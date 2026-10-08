package com.motorva;

import java.util.UUID;
import jakarta.persistence.*;

@Entity
@Table(name="account_vehicles")
public class AccountVehicle {
    @Id private UUID id;
    @Column(nullable=false) private UUID ownerId;
    @Column(nullable=false) private UUID vehicleId;
    @Column(nullable=false, columnDefinition="text") private String payload;
    protected AccountVehicle() {}
    AccountVehicle(UUID ownerId, UUID vehicleId) { this.id = UUID.randomUUID(); this.ownerId = ownerId; this.vehicleId = vehicleId; }
    String payload() { return payload; }
    void payload(String payload) { this.payload = payload; }
}

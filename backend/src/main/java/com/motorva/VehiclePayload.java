package com.motorva;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

public record VehiclePayload(
        @NotNull UUID id, @NotNull @Min(1886) @Max(9999) Integer year,
        @NotBlank @Size(max=60) String make, @NotBlank @Size(max=80) String model,
        @NotNull @Min(0) @Max(9999999) Long mileage,
        @Size(max=450000) @Pattern(regexp="^data:image/(?:jpeg;base64,/9j/|png;base64,iVBORw0KGgo)[A-Za-z0-9+/]+={0,2}$") String photo,
        @Size(max=1000) List<@NotNull @Valid Service> services,
        @Size(max=1000) List<@NotNull @Valid Reminder> reminders) {
    public record Service(@NotNull UUID id, @NotBlank @Size(max=80) String title,
            @NotNull @PastOrPresent LocalDate date, @NotNull @Min(0) @Max(9999999) Long mileage,
            @Min(0) @Max(99999999) Long costCents, @NotNull @Size(max=2000) String notes) {}
    public record Reminder(@NotNull UUID id, @NotBlank @Size(max=80) String title,
            LocalDate dueDate, @Min(0) @Max(9999999) Long dueMileage, @PastOrPresent LocalDate completedDate) {}
}

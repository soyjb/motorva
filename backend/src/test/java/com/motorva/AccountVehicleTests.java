package com.motorva;

import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:accounts;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1", "spring.datasource.username=sa", "spring.datasource.password=", "motorva.supabase-url=https://example.supabase.co", "spring.flyway.locations=classpath:db/migration/common"})
@AutoConfigureMockMvc
class AccountVehicleTests {
    @Autowired MockMvc mvc;
    @Autowired org.springframework.jdbc.core.JdbcTemplate jdbc;
    @Test void orderIsPersistentOwnerScopedAndDoesNotOverwriteVehicleData() throws Exception {
        String owner = UUID.randomUUID().toString(), other = UUID.randomUUID().toString();
        String first = UUID.randomUUID().toString(), second = UUID.randomUUID().toString(), third = UUID.randomUUID().toString();
        for (String id : new String[]{first, second}) {
            String body = "{\"id\":\"" + id + "\",\"year\":2024,\"make\":\"Toyota\",\"model\":\"Camry\",\"mileage\":24000}";
            mvc.perform(put("/api/vehicles/"+id).with(jwt().jwt(token -> token.subject(owner))).contentType("application/json").content(body)).andExpect(status().isOk());
        }
        String order = "{\"ids\":[\""+second+"\",\""+first+"\"]}";
        mvc.perform(put("/api/vehicles/order").contentType("application/json").content(order)).andExpect(status().isUnauthorized());
        mvc.perform(put("/api/vehicles/order").with(jwt().jwt(token -> token.subject(other))).contentType("application/json").content(order)).andExpect(status().isConflict());
        mvc.perform(put("/api/vehicles/order").with(jwt().jwt(token -> token.subject(owner))).contentType("application/json").content(order)).andExpect(status().isNoContent());
        String update = "{\"id\":\""+second+"\",\"year\":2024,\"make\":\"Toyota\",\"model\":\"Camry\",\"mileage\":25000}";
        mvc.perform(put("/api/vehicles/"+second).with(jwt().jwt(token -> token.subject(owner))).contentType("application/json").content(update)).andExpect(status().isOk());
        mvc.perform(get("/api/vehicles").with(jwt().jwt(token -> token.subject(owner))))
                .andExpect(jsonPath("$[0].id").value(second)).andExpect(jsonPath("$[0].mileage").value(25000)).andExpect(jsonPath("$[1].id").value(first));
        for (String invalid : new String[]{"{\"ids\":[]}", "{\"ids\":[\""+second+"\",\""+second+"\"]}", "{\"ids\":[\""+second+"\",\""+third+"\"]}"})
            mvc.perform(put("/api/vehicles/order").with(jwt().jwt(token -> token.subject(owner))).contentType("application/json").content(invalid)).andExpect(status().isConflict());
        update = "{\"id\":\""+third+"\",\"year\":2024,\"make\":\"Toyota\",\"model\":\"Camry\",\"mileage\":0}";
        mvc.perform(put("/api/vehicles/"+third).with(jwt().jwt(token -> token.subject(owner))).contentType("application/json").content(update)).andExpect(status().isOk());
        mvc.perform(get("/api/vehicles").with(jwt().jwt(token -> token.subject(owner)))).andExpect(jsonPath("$[2].id").value(third));
        mvc.perform(put("/api/vehicles/order").with(jwt().jwt(token -> token.subject(owner))).contentType("application/json").content(order)).andExpect(status().isConflict());
    }
    @Test void acceptsPngPhotosAndRejectsSvgPhotos() throws Exception {
        String owner = UUID.randomUUID().toString();
        String id = UUID.randomUUID().toString();
        String photo = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==";
        String body = "{\"id\":\"" + id + "\",\"year\":2024,\"make\":\"Toyota\",\"model\":\"Camry\",\"mileage\":24000,\"photo\":\"" + photo + "\"}";
        mvc.perform(put("/api/vehicles/" + id).with(jwt().jwt(token -> token.subject(owner))).contentType("application/json").content(body))
                .andExpect(status().isOk()).andExpect(jsonPath("$.photo").value(photo));
        mvc.perform(put("/api/vehicles/" + id).with(jwt().jwt(token -> token.subject(owner))).contentType("application/json")
                .content(body.replace(photo, "data:image/svg+xml;base64,PHN2Zz4="))).andExpect(status().isBadRequest());
    }
    @Test void allowsConfiguredFrontendPreflightAndRejectsOtherOrigins() throws Exception {
        mvc.perform(options("/api/vehicles")
                .header("Origin", "http://localhost:3001")
                .header("Access-Control-Request-Method", "GET")
                .header("Access-Control-Request-Headers", "authorization"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:3001"));
        mvc.perform(options("/api/vehicles")
                .header("Origin", "https://untrusted.example")
                .header("Access-Control-Request-Method", "PUT")
                .header("Access-Control-Request-Headers", "authorization,content-type"))
                .andExpect(status().isForbidden());
    }
    @Test void applicationTablesAndMigrationHistoryUseDedicatedSchema() {
        org.junit.jupiter.api.Assertions.assertEquals(1, jdbc.queryForObject("select count(*) from information_schema.tables where lower(table_schema) = 'motorva' and lower(table_name) = 'account_vehicles'", Integer.class));
        org.junit.jupiter.api.Assertions.assertEquals(1, jdbc.queryForObject("select count(*) from information_schema.tables where lower(table_schema) = 'motorva' and lower(table_name) = 'flyway_schema_history'", Integer.class));
        org.junit.jupiter.api.Assertions.assertEquals(0, jdbc.queryForObject("select count(*) from information_schema.tables where lower(table_schema) = 'public' and lower(table_name) = 'account_vehicles'", Integer.class));
    }
    @Test void rejectsMissingAndFractionalMileageAndRetainsNestedHistory() throws Exception {
        String owner = UUID.randomUUID().toString();
        String id = UUID.randomUUID().toString();
        String serviceId = UUID.randomUUID().toString();
        String reminderId = UUID.randomUUID().toString();
        String body = """
            {"id":"%s","year":2024,"make":"Toyota","model":"Camry","mileage":35000,
             "services":[{"id":"%s","title":"Oil change","date":"2026-01-01","mileage":34000,"costCents":7599,"notes":"Filter replaced"}],
             "reminders":[{"id":"%s","title":"Oil change","dueMileage":34000,"completedDate":"2026-01-01"}]}
            """.formatted(id, serviceId, reminderId);
        mvc.perform(put("/api/vehicles/"+id).with(jwt().jwt(token -> token.subject(owner))).contentType("application/json").content(body)).andExpect(status().isOk()).andExpect(jsonPath("$.photo").doesNotExist());
        mvc.perform(get("/api/vehicles").with(jwt().jwt(token -> token.subject(owner))))
                .andExpect(jsonPath("$[0].services[0].costCents").value(7599))
                .andExpect(jsonPath("$[0].reminders[0].completedDate").value("2026-01-01"))
                .andExpect(jsonPath("$[0].reminders[0].dueDate").doesNotExist());
        mvc.perform(put("/api/vehicles/"+id).with(jwt().jwt(token -> token.subject(owner))).contentType("application/json").content(body.replace("35000", "35000.5"))).andExpect(status().isBadRequest());
        mvc.perform(put("/api/vehicles/"+id).with(jwt().jwt(token -> token.subject(owner))).contentType("application/json").content(body.replace("\"mileage\":35000,", ""))).andExpect(status().isBadRequest());
    }
    @Test void accountDataIsScopedToVerifiedUser() throws Exception {
        String owner = UUID.randomUUID().toString();
        String other = UUID.randomUUID().toString();
        String id = UUID.randomUUID().toString();
        String body = "{\"id\":\"" + id + "\",\"year\":2024,\"make\":\"Toyota\",\"model\":\"Camry\",\"mileage\":24000}";
        mvc.perform(get("/api/vehicles")).andExpect(status().isUnauthorized());
        mvc.perform(put("/api/vehicles/"+id).with(jwt().jwt(token -> token.subject(owner))).contentType("application/json").content(body)).andExpect(status().isOk());
        mvc.perform(get("/api/vehicles").with(jwt().jwt(token -> token.subject(owner)))).andExpect(jsonPath("$[0].model").value("Camry"));
        mvc.perform(get("/api/vehicles").with(jwt().jwt(token -> token.subject(other)))).andExpect(content().json("[]"));
        mvc.perform(delete("/api/vehicles/"+id).with(jwt().jwt(token -> token.subject(other)))).andExpect(status().isNotFound());
        mvc.perform(put("/api/vehicles/"+id).with(jwt().jwt(token -> token.subject(owner))).contentType("application/json").content(body.replace("24000", "-1"))).andExpect(status().isBadRequest());
        mvc.perform(delete("/api/vehicles/"+id).with(jwt().jwt(token -> token.subject(owner)))).andExpect(status().isNoContent());
    }
}

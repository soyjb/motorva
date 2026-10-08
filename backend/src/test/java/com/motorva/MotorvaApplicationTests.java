package com.motorva;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:smoke;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa", "spring.datasource.password=",
    "motorva.supabase-url=https://example.supabase.co",
    "spring.flyway.locations=classpath:db/migration/common"
})
class MotorvaApplicationTests {

	@Test
	void contextLoads() {
	}

}


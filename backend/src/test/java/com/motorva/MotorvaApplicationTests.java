package com.motorva;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

// Database integration will be tested once PostgreSQL configuration is introduced.
@SpringBootTest(properties = "spring.autoconfigure.exclude="
		+ "org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration")
class MotorvaApplicationTests {

	@Test
	void contextLoads() {
	}

}


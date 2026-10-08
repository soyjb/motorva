package com.motorva;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.UUID;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import static org.junit.jupiter.api.Assertions.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:aiusage;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1", "spring.datasource.username=sa", "spring.datasource.password=", "motorva.supabase-url=https://example.supabase.co", "spring.flyway.locations=classpath:db/migration/common", "motorva.ai-account-daily-limit=2", "motorva.ai-global-daily-limit=5"})
class AiUsageLimiterTests {
    @Autowired AiUsageLimiter limiter;
    @Autowired JdbcTemplate jdbc;
    @Autowired PlatformTransactionManager transactions;
    @BeforeEach void reset() {
        jdbc.update("DELETE FROM motorva.ai_account_usage");
        jdbc.update("UPDATE motorva.ai_daily_budget SET usage_day=DATE '1970-01-01', requests=0 WHERE id=1");
    }
    @Test void limitsSurviveNewServiceAndGlobalBudgetCoversAllAccounts() {
        UUID owner=UUID.randomUUID();
        limiter.reserve(owner); limiter.reserve(owner);
        var restarted = new AiUsageLimiter(jdbc,2,5);
        assertEquals(429, assertThrows(ResponseStatusException.class, () -> new TransactionTemplate(transactions).executeWithoutResult(status -> restarted.reserve(owner))).getStatusCode().value());
        limiter.reserve(UUID.randomUUID()); limiter.reserve(UUID.randomUUID()); limiter.reserve(UUID.randomUUID());
        assertThrows(ResponseStatusException.class, () -> limiter.reserve(UUID.randomUUID()));
        assertEquals(5, jdbc.queryForObject("SELECT requests FROM motorva.ai_daily_budget WHERE id=1",Integer.class));
    }
    @Test void utcDayRolloverResetsBothCountersAndZeroLimitDisablesPaidCalls() {
        UUID owner=UUID.randomUUID();
        limiter.reserve(owner); limiter.reserve(owner);
        LocalDate yesterday=LocalDate.now(ZoneOffset.UTC).minusDays(1);
        jdbc.update("UPDATE motorva.ai_daily_budget SET usage_day=?,requests=5 WHERE id=1",yesterday);
        jdbc.update("UPDATE motorva.ai_account_usage SET usage_day=? WHERE owner_id=?",yesterday,owner);
        limiter.reserve(owner);
        assertEquals(1,jdbc.queryForObject("SELECT requests FROM motorva.ai_daily_budget WHERE id=1",Integer.class));
        assertEquals(1,jdbc.queryForObject("SELECT requests FROM motorva.ai_account_usage WHERE owner_id=?",Integer.class,owner));
        var disabled=new AiUsageLimiter(jdbc,0,5);
        assertThrows(ResponseStatusException.class, () -> new TransactionTemplate(transactions).executeWithoutResult(status -> disabled.reserve(UUID.randomUUID())));
        assertEquals(1,jdbc.queryForObject("SELECT requests FROM motorva.ai_daily_budget WHERE id=1",Integer.class));
    }
    @Test void concurrentReservationsCannotOvershootGlobalLimit() throws Exception {
        var pool=Executors.newFixedThreadPool(8);
        var start=new CountDownLatch(1);
        var results=new java.util.ArrayList<Future<Boolean>>();
        try {
            for (int i=0;i<16;i++) results.add(pool.submit(() -> {
                start.await();
                try { limiter.reserve(UUID.randomUUID()); return true; }
                catch(ResponseStatusException exception) { assertEquals(429,exception.getStatusCode().value()); return false; }
            }));
            start.countDown();
            int accepted=0;
            for (var result:results) if (result.get(15,TimeUnit.SECONDS)) accepted++;
            assertEquals(5,accepted);
            assertEquals(5,jdbc.queryForObject("SELECT requests FROM motorva.ai_daily_budget WHERE id=1",Integer.class));
        } finally { start.countDown(); pool.shutdownNow(); }
    }
}

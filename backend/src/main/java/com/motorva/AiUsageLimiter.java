package com.motorva;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AiUsageLimiter {
    private final JdbcTemplate jdbc;
    private final int accountLimit, globalLimit;
    AiUsageLimiter(JdbcTemplate jdbc, @Value("${motorva.ai-account-daily-limit:10}") int accountLimit,
                   @Value("${motorva.ai-global-daily-limit:100}") int globalLimit) {
        if (accountLimit < 0 || globalLimit < 0) throw new IllegalArgumentException("AI daily limits cannot be negative");
        this.jdbc = jdbc; this.accountLimit = accountLimit; this.globalLimit = globalLimit;
    }
    // Commit before the provider call: failures and cancellations still consume an attempt.
    // This one database lock serializes reservations across accounts and app instances.
    @Transactional(timeout=5)
    public void reserve(UUID owner) {
        var row = jdbc.queryForMap("SELECT usage_day, requests FROM motorva.ai_daily_budget WHERE id=1 FOR UPDATE");
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        int global = today.equals(((java.sql.Date) row.get("usage_day")).toLocalDate()) ? ((Number) row.get("requests")).intValue() : 0;
        var accounts = jdbc.queryForList("SELECT usage_day, requests FROM motorva.ai_account_usage WHERE owner_id=?", owner);
        int account = 0;
        if (!accounts.isEmpty()) {
            var previous = accounts.getFirst();
            if (today.equals(((java.sql.Date) previous.get("usage_day")).toLocalDate())) account = ((Number) previous.get("requests")).intValue();
        }
        if (account >= accountLimit || global >= globalLimit)
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Daily AI question limit reached. Limits reset at midnight UTC. Safety guidance remains available.");
        jdbc.update("UPDATE motorva.ai_daily_budget SET usage_day=?, requests=? WHERE id=1", today, global+1);
        if (accounts.isEmpty()) jdbc.update("INSERT INTO motorva.ai_account_usage(owner_id,usage_day,requests) VALUES(?,?,?)", owner,today,1);
        else jdbc.update("UPDATE motorva.ai_account_usage SET usage_day=?,requests=? WHERE owner_id=?",today,account+1,owner);
    }
}

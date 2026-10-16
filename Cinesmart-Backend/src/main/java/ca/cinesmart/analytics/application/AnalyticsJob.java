package ca.cinesmart.analytics.application;

import ca.cinesmart.analytics.persistence.AnalyticsRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.OptionalInt;

/**
 * Recomputes movie_analytics every analytics.refresh-interval and once after startup (change.md Q12, Q13).
 * Both runs use the scheduler thread, so startup isn't blocked and runs never overlap in one instance.
 */
@Service
public class AnalyticsJob {

    private static final Logger log = LoggerFactory.getLogger(AnalyticsJob.class);

    private final AnalyticsRepository repository;
    private final TaskScheduler scheduler;
    private final int minVotes;

    public AnalyticsJob(AnalyticsRepository repository,
                        TaskScheduler scheduler,
                        @Value("${analytics.min-votes:5}") int minVotes) {
        this.repository = repository;
        this.scheduler = scheduler;
        this.minVotes = minVotes;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void refreshOnStartup() {
        scheduler.schedule(this::refresh, Instant.now());
    }

    /** The first scheduled run waits one interval; the startup run covers the start. */
    @Scheduled(fixedDelayString = "${analytics.refresh-interval:PT1H}",
            initialDelayString = "${analytics.refresh-interval:PT1H}")
    public void refresh() {
        try {
            OptionalInt movies = repository.refresh(minVotes);
            if (movies.isPresent()) {
                log.info("analytics refreshed: {} movies", movies.getAsInt());
            } else {
                log.info("analytics refresh skipped: another instance is running it");
            }
        } catch (RuntimeException ex) {
            log.error("analytics refresh failed; previous values kept", ex);
        }
    }
}

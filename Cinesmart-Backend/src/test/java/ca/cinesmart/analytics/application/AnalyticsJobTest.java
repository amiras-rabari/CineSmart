package ca.cinesmart.analytics.application;

import ca.cinesmart.analytics.persistence.AnalyticsRepository;
import org.junit.jupiter.api.Test;
import org.springframework.scheduling.TaskScheduler;

import java.time.Instant;
import java.util.OptionalInt;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** The batch never crashes the scheduler and runs once on startup (change.md Q12, Q13). */
class AnalyticsJobTest {

    private final AnalyticsRepository repository = mock(AnalyticsRepository.class);
    private final TaskScheduler scheduler = mock(TaskScheduler.class);
    private final AnalyticsJob job = new AnalyticsJob(repository, scheduler, 5);

    @Test
    void usesTheConfiguredMinimumVotes() {
        when(repository.refresh(5)).thenReturn(OptionalInt.of(20));
        job.refresh();
        verify(repository).refresh(5);
    }

    @Test
    void aFailedRunKeepsThePreviousValuesAndDoesNotThrow() {
        when(repository.refresh(5)).thenThrow(new IllegalStateException("db down"));
        assertThatCode(job::refresh).doesNotThrowAnyException();
    }

    @Test
    void skippedRunWhenAnotherInstanceHoldsTheLock() {
        when(repository.refresh(5)).thenReturn(OptionalInt.empty());
        assertThatCode(job::refresh).doesNotThrowAnyException();
    }

    @Test
    void startupRunIsHandedToTheSchedulerInsteadOfBlocking() {
        job.refreshOnStartup();
        verify(scheduler).schedule(any(Runnable.class), any(Instant.class));
    }
}

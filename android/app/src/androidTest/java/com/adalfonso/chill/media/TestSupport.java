package com.adalfonso.chill.media;

import androidx.test.platform.app.InstrumentationRegistry;
import java.util.concurrent.Callable;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.BooleanSupplier;

/** Helpers the instrumented media tests share. */
final class TestSupport {

  private static final long TIMEOUT_MS = 10_000;

  private TestSupport() {}

  /**
   * Run something on the main thread, where media3 controllers must be used.
   *
   * @param runnable what to run
   */
  static void onMain(Runnable runnable) {
    InstrumentationRegistry.getInstrumentation().runOnMainSync(runnable);
  }

  /**
   * Run something on the main thread and return its result.
   *
   * @param callable what to run
   * @param <T> the result type
   * @return what it returned
   * @throws Exception whatever it threw
   */
  static <T> T onMain(Callable<T> callable) throws Exception {
    AtomicReference<T> result = new AtomicReference<>();
    AtomicReference<Exception> error = new AtomicReference<>();

    onMain(
        () -> {
          try {
            result.set(callable.call());
          } catch (Exception e) {
            error.set(e);
          }
        });

    if (error.get() != null) {
      throw error.get();
    }

    return result.get();
  }

  /**
   * Wait until a condition holds, checking it on the main thread.
   *
   * @param condition what must become true
   * @throws Exception when it does not become true in time
   */
  static void waitUntil(BooleanSupplier condition) throws Exception {
    long deadline = System.currentTimeMillis() + TIMEOUT_MS;

    while (System.currentTimeMillis() < deadline) {
      if (onMain(condition::getAsBoolean)) {
        return;
      }

      Thread.sleep(50);
    }

    throw new AssertionError("Condition not met within " + TIMEOUT_MS / 1000 + " seconds");
  }
}

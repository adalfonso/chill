package com.adalfonso.chill.media.playback;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;

public class QueueStoreTest {

  @Rule public TemporaryFolder folder = new TemporaryFolder();

  private Path file;
  private QueueStore store;

  private static final List<String> TRACKS =
      List.of("{\"id\":1,\"title\":\"a\"}", "{\"id\":2,\"title\":\"b\"}", "{\"id\":3,\"title\":\"c\"}");

  @Before
  public void setUp() {
    file = folder.getRoot().toPath().resolve("queue.json");
    store = new QueueStore(file);
  }

  @Test
  public void a_saved_queue_loads_back_the_same() throws Exception {
    QueueSnapshot saved = new QueueSnapshot(TRACKS, 2, 41_000, true, List.of(3L, 1L, 2L));

    store.save(saved);

    assertEquals(saved, new QueueStore(file).load().orElseThrow());
  }

  @Test
  public void no_file_means_no_queue() {
    assertFalse(store.load().isPresent());
  }

  @Test
  public void a_truncated_file_is_discarded() throws Exception {
    Files.write(file, "{\"version\":1,\"tra".getBytes(StandardCharsets.UTF_8));

    assertFalse(store.load().isPresent());
    assertFalse(Files.exists(file));
  }

  @Test
  public void an_unknown_version_is_discarded() throws Exception {
    store.save(new QueueSnapshot(TRACKS, 0, 0, false, List.of()));
    Files.write(
        file,
        new String(Files.readAllBytes(file), StandardCharsets.UTF_8)
            .replace("\"version\":1", "\"version\":99")
            .getBytes(StandardCharsets.UTF_8));

    assertFalse(store.load().isPresent());
  }

  @Test
  public void an_index_outside_the_tracks_is_discarded() throws Exception {
    store.save(new QueueSnapshot(TRACKS, 5, 0, false, List.of()));

    assertFalse(store.load().isPresent());
  }

  @Test
  public void an_interrupted_write_leaves_the_previous_queue() throws Exception {
    QueueSnapshot saved = new QueueSnapshot(TRACKS, 1, 5_000, false, List.of());
    store.save(saved);
    // A crash after the temporary file is written but before the rename
    Files.write(file.resolveSibling("queue.json.tmp"), "{partial".getBytes(StandardCharsets.UTF_8));

    assertEquals(saved, store.load().orElseThrow());
  }

  @Test
  public void delete_forgets_the_queue() throws Exception {
    store.save(new QueueSnapshot(TRACKS, 0, 0, false, List.of()));
    store.delete();

    assertTrue(store.load().isEmpty());
  }
}

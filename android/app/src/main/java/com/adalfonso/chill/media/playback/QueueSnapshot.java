package com.adalfonso.chill.media.playback;

import java.util.List;

/**
 * A saved queue: the tracks in play order, each as the server's JSON, plus where playback was.
 * When the queue was shuffled, {@code originalOrder} holds the track ids in their order before
 * the shuffle; otherwise it is empty.
 */
public record QueueSnapshot(
    List<String> tracks,
    int index,
    long positionMs,
    boolean shuffled,
    List<Long> originalOrder) {}

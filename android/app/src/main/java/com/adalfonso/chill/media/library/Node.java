package com.adalfonso.chill.media.library;

/**
 * One entry in the car's browse list. {@code artFilename} is the cover's server filename, or null
 * when there is none; {@code subtitle} may be empty.
 */
public record Node(
    String id,
    String title,
    String subtitle,
    String artFilename,
    boolean browsable,
    boolean playable) {}

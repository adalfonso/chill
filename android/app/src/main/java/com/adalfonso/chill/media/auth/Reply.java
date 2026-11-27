package com.adalfonso.chill.media.auth;

import java.util.List;

/** What a server answered: the status code, the body text and any {@code Set-Cookie} headers. */
public record Reply(int status, String body, List<String> setCookies) {}

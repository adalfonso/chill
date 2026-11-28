package com.adalfonso.chill.media.auth;

import java.io.IOException;

/** The login is gone: there are no cookies, or the refresh was refused. */
public final class SignedOutException extends IOException {

  /** Creates the exception. */
  public SignedOutException() {
    super("Signed out");
  }
}

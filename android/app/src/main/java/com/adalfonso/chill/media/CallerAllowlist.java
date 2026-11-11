package com.adalfonso.chill.media;

import java.util.Set;

/**
 * The guest list for the media service. Android Auto can only find the service if
 * it is visible to other apps, which would let any app connect, so each connecting
 * app's package name is checked here. Used by {@link ChillMediaService}.
 */
public final class CallerAllowlist {

  /** Android Auto. */
  public static final String ANDROID_AUTO = "com.google.android.projection.gearhead";

  /** The system UI, which draws notification and lock screen media controls. */
  public static final String SYSTEM_UI = "com.android.systemui";

  /** Android itself, which handles media buttons such as a headset's play/pause. */
  public static final String ANDROID_FRAMEWORK = "android";

  private static final Set<String> ALLOWED = Set.of(ANDROID_AUTO, SYSTEM_UI, ANDROID_FRAMEWORK);

  private CallerAllowlist() {}

  /** Whether an app may connect: it is Chill itself or on the allowed list. */
  public static boolean isAllowed(String callerPackage, String ownPackage) {
    if (callerPackage == null) {
      return false;
    }

    return callerPackage.equals(ownPackage) || ALLOWED.contains(callerPackage);
  }
}

export const castDebugLogger = cast.debug.CastDebugLogger.getInstance();
export const log_tag = "Chill.LOG";

castDebugLogger.setEnabled(true);
// castDebugLogger.showDebugLogs(true);

// Set verbosity level for Core events.
castDebugLogger.loggerLevelByEvents = {
  "cast.framework.events.category.CORE": cast.framework.LoggerLevel.INFO,
  "cast.framework.events.EventType.MEDIA_STATUS":
    cast.framework.LoggerLevel.DEBUG,
};

// Set verbosity level for custom tags.
castDebugLogger.loggerLevelByTags = {
  LOG_TAG: cast.framework.LoggerLevel.DEBUG,
};

export const debug = (msg) => {
  const debug_element = document.querySelector("#debug");

  if (debug_element === null) {
    return;
  }

  debug_element.innerHTML = msg;
};

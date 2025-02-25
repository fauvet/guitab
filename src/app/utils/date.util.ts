import TimeAgo from "javascript-time-ago";
import en from "javascript-time-ago/locale/en";

export default class DateUtil {
  static {
    TimeAgo.addDefaultLocale(en);
  }

  static buildTimeAgo(date: Date): string {
    const timeAgo = new TimeAgo(en.locale);
    return timeAgo.format(date);
  }
}

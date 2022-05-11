import {LessonData} from '../globalTypes';

export type NotificationProviders = 'Discord' | 'Webpush' | 'Mail'

export interface NotificationProps {
	/// The title of the notification
	title: string,
	/// The payload to be displayed
	payload: string,
	/// Array of hashed untis names
	targets: string[],
}

/// Format: YYYY-MM-DD
export type DateString = string;
/// Format: HH:mm
export type StartTime = string;

export interface LessonCache {
	[key: DateString]: {
		[key: StartTime]: LessonData[]
	}
}
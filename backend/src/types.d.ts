export interface NotificationProps {
	/// The title of the notification
	title: string,
	/// The payload to be displayed
	payload: string,
	/// Array of hashed untis names
	targets: string[],
}
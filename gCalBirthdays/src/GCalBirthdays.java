
/* INSTRUCTION: This is a command line application. So please execute this template with the following arguments:

 arg[0] = username
 arg[1] = password
 */

/**
 * @author (Frank Glaser)
 *
 */


import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URL;
import java.text.SimpleDateFormat;
import java.util.Date;

import com.google.gdata.client.contacts.*;
import com.google.gdata.client.Query;
import com.google.gdata.client.calendar.CalendarService;
import com.google.gdata.data.batch.BatchOperationType;
import com.google.gdata.data.batch.BatchUtils;
import com.google.gdata.data.calendar.CalendarEntry;
import com.google.gdata.data.calendar.CalendarEventEntry;
import com.google.gdata.data.calendar.CalendarEventFeed;
import com.google.gdata.data.calendar.CalendarFeed;
import com.google.gdata.data.calendar.ColorProperty;
import com.google.gdata.data.calendar.HiddenProperty;
import com.google.gdata.data.calendar.SelectedProperty;
import com.google.gdata.data.contacts.ContactEntry;
import com.google.gdata.data.contacts.ContactFeed;
import com.google.gdata.data.extensions.Recurrence;
import com.google.gdata.data.extensions.Reminder;
import com.google.gdata.data.extensions.Reminder.Method;
import com.google.gdata.data.Link;
import com.google.gdata.data.PlainTextConstruct;
import com.google.gdata.util.AuthenticationException;
import com.google.gdata.util.ServiceException;


public class GCalBirthdays {

	private static final String APP_NAME  = "gCalBirthdays";

	private static final String CALENDAR_NAME    = "Birthdays";  //"Geburtstage";
	private static final String CALENDAR_SUMMARY = "This calendar contains the birthdays of Your Google Contacts.";
	private static final String CALENDAR_COLOR   = "#A32929";    // red "#A32929", blue "#2952A3" and green "#0D7813"
	
	private static final String CONTACTS_FEED_URL  = "http://www.google.com/m8/feeds/contacts/default/full";
	private static final String CALENDARS_FEED_URL = "http://www.google.com/calendar/feeds/default/owncalendars/full";

	private static final String DATE_FORMAT_CONTACTS = "yyyy-MM-dd";
	private static final String DATE_FORMAT_CALENDAR = "yyyyMMdd";
	private static final String DATE_FORMAT_YEAR 	 = "yyyy";
	
	private static final Integer REMINDER_DAYS = 14;
    
    private static String userName;
	private static String userPassword;

	// Birthday calendar
	private static CalendarEntry calEntry; 
	
	
	public static void main(String[] args) {
		
		try {

			if ( args.length < 2 ) {
				System.out.println("Usage: gCalBirthdays username password");	
				return;
			}
			
		    userName = args[0];
		    userPassword = args[1];
	
			// Create a new Contacts service
			ContactsService myService = new ContactsService(APP_NAME);
			myService.setProtocolVersion(ContactsService.Versions.V3);
			myService.setUserCredentials(userName, userPassword);
			
			// The URL for all contacts of the specified user
			URL conUrl = new URL( CONTACTS_FEED_URL );

			// Get Number of contacts	
			Query conQuery = new Query(conUrl);
			conQuery.setMaxResults(1);		 
			ContactFeed conFeed = myService.query(conQuery, ContactFeed.class);
			if (conFeed.getTotalResults() == 0) {
				System.out.println("No Contacts");
				return;
			} else {
				// Set Number of contacts for query
				conQuery.setMaxResults(conFeed.getTotalResults());
				conFeed = myService.query(conQuery, ContactFeed.class);
			}	
			
/* //DEBUG:		
	        System.out.println("All contacts:");
			for (ContactEntry contact : conFeed.getEntries()) {
				System.out.println("\tContact: "
						+ (contact.hasName() ? contact.getName().getFullName().getValue() : "null")
						+ (contact.hasBirthday() ? "\t" + contact.getBirthday().getValue() : ""));
			}
*/
			
			// Create CalendarService and authenticate using ClientLogin
			CalendarService calService = new CalendarService(APP_NAME);
			calService.setProtocolVersion(CalendarService.Versions.V2_1);
			calService.setUserCredentials(userName, userPassword);

			// The URL for the own calendars feed of the specified user
			URL calUrl = new URL ( CALENDARS_FEED_URL );

			// Get Number of calendars	
			Query calQuery = new Query(calUrl);
			calQuery.setMaxResults(1);		 
			CalendarFeed calFeed = calService.query(calQuery, CalendarFeed.class);
			if (calFeed.getTotalResults() == 0) {
				System.out.println("No Calendars");
			} else {
				// Set Number of calendars for query
				calQuery.setMaxResults(calFeed.getTotalResults());
				calFeed = calService.query(calQuery, CalendarFeed.class);	
			}
			
			// Search calendar
			System.out.println("Calendar to use for birthdays");
			for (CalendarEntry entry : calFeed.getEntries()) {
				if ( entry.getTitle().getPlainText().equals( CALENDAR_NAME ) ) {
					calEntry = entry;
				}
			}
			if (calEntry == null) {
				// No calendar found - Add a birthday calendar
				calEntry = new CalendarEntry();
				calEntry.setTitle(new PlainTextConstruct( CALENDAR_NAME ));
				calEntry.setSummary(new PlainTextConstruct( CALENDAR_SUMMARY ));
				calEntry.setTimeZone(calFeed.getEntries().get(0).getTimeZone());
				calEntry.setHidden(HiddenProperty.FALSE);
				calEntry.setColor(new ColorProperty( CALENDAR_COLOR ));
				calEntry.setSelected(SelectedProperty.TRUE);
				//calEntry.addLocation(new Where("", "", "Oakland"));
				//calEntry.addLocation(calFeed.getEntries().get(0).getLocations().);

			    // Insert the calendar
				calService.insert(calUrl, calEntry);
				System.out.println("\tCreated: " + calEntry.getTitle().getPlainText());
				//Thread.sleep(5000);
				calQuery.setMaxResults(calFeed.getTotalResults()+1);
				calFeed = calService.query(calQuery, CalendarFeed.class);	
				for (CalendarEntry entry : calFeed.getEntries()) {
					if ( entry.getTitle().getPlainText().equals( CALENDAR_NAME ) ) {
						calEntry = entry;
					}
				}
			}
			else {
				System.out.println("\tFound: " + ( (calEntry != null) ? calEntry.getTitle().getPlainText() : "null") );
			}

			
			// Get all events
			URL eventUrl = new URL ( calEntry.getLink(Link.Rel.ALTERNATE, Link.Type.ATOM).getHref() );
			
			// Get Number of events	
			Query eventQuery = new Query(eventUrl);
			eventQuery.setMaxResults(1);		 
			CalendarEventFeed eventFeed = calService.query(eventQuery, CalendarEventFeed.class);	
			if (eventFeed.getTotalResults() == 0) {
				System.out.println("No Events");
			} else {
				// Set Number of events for query
				eventQuery.setMaxResults(eventFeed.getTotalResults());
				eventFeed = calService.query(eventQuery, CalendarEventFeed.class);				
			}

			Boolean exists = false;
			Boolean update = false; 
			Integer batchid = 0;

		    Method methodType = Method.ALERT; //Method.EMAIL;
		    Reminder reminder = new Reminder();
		    reminder.setDays( REMINDER_DAYS );
		    reminder.setMethod(methodType);
			CalendarEventFeed batchRequest = new CalendarEventFeed();

			// Copy contacts with title and birthday and check if event exists
			for (ContactEntry contact : conFeed.getEntries()) {

				if ( (contact.hasName()) && (contact.hasBirthday()) ) {

					exists = false;
					update = false;
					
					CalendarEventEntry entry = new CalendarEventEntry();
					
					SimpleDateFormat sdf = new SimpleDateFormat( DATE_FORMAT_CONTACTS );
				    Date date = sdf.parse(contact.getBirthday().getWhen());
				    sdf.applyPattern( DATE_FORMAT_CALENDAR );
					
					for ( CalendarEventEntry event : eventFeed.getEntries() ) {

						if ( event.getTitle().getPlainText().contains( contact.getName().getFullName().getValue() ) ) {
							// found event for given contact
							// check date

							if ( event.getRecurrence().getValue().contains( sdf.format(date) )) {
							//if ( event.getRecurrence().getValue().contains( recurData.substring(0, 25) )) {
								// same date - nothing todo
								//DEBUG: 
								System.out.println("\tcontact and event have same date: " + contact.getName().getFullName().getValue() + " " + event.getTitle().getPlainText() );
								exists = true;
							}
							else {
								// date not correct - update date
								//DEBUG: 
								System.out.println("\tcontact and event have not the same date: " + contact.getName().getFullName().getValue() + " " + contact.getBirthday().getWhen() + " " + event.getTitle().getPlainText() /* + " " + event.getRecurrence().getValue() */ );
								update = true;
								entry = event;
							}
						}
					}
					if ( exists == false ) {
						// no event for given contact - add event
						sdf.applyPattern( DATE_FORMAT_YEAR );
						entry.setTitle( new PlainTextConstruct( contact.getName().getFullName().getValue() + " " + sdf.format(date) ) );
						entry.setContent( new PlainTextConstruct( "Birthday Celebration " + contact.getName().getFullName().getValue() + " (Born in " + sdf.format(date) + ")") );
					    sdf.applyPattern( DATE_FORMAT_CALENDAR );
						String recurData = "DTSTART;VALUE=DATE:" + sdf.format(date) + "\n"
					    				 + "DTEND;VALUE=DATE:" + sdf.format(date) + "\n"
					    				 + "RRULE:FREQ=YEARLY";
					    Recurrence recur = new Recurrence();
					    recur.setValue(recurData);
					    entry.setRecurrence(recur);

					    entry.getReminder().add(reminder);
					    //entry.update();


						batchid++;
						BatchUtils.setBatchId(entry, batchid.toString());
						if ( update == true ) {
							//DEBUG: 
							System.out.println("\tUpd contact: " + contact.getName().getFullName().getValue());
							BatchUtils.setBatchOperationType(entry, BatchOperationType.UPDATE);
						} else {
							//DEBUG: 
							System.out.println("\tAdd contact: " + contact.getName().getFullName().getValue());
							BatchUtils.setBatchOperationType(entry, BatchOperationType.INSERT);	
						}
						batchRequest.getEntries().add(entry);
					}
				} 
			}

			
			// Get the batch link URL and send the batch request there.
			if ( batchRequest.getEntries().isEmpty() ) {
				System.out.println("No Batch Request");
			}else {
		        System.out.println("Send Calendar Batch Request");
				Link batchLink = eventFeed.getLink(Link.Rel.FEED_BATCH, Link.Type.ATOM);
				//CalendarEventFeed batchResponse = 
					calService.batch(new URL(batchLink.getHref()), batchRequest);
			}
			
/* //DEBUG:			
			// Print all events	
			// Get Number of calendar entries	
			eventQuery.setMaxResults(1);		 
			CalendarEventFeed resultFeed = calService.query(eventQuery, CalendarEventFeed.class);	
			if (resultFeed.getTotalResults() == 0) {
				System.out.println("No Events");
			} else {
				// Set Number of contacts for query
				eventQuery.setMaxResults(resultFeed.getTotalResults());
				resultFeed = calService.query(eventQuery, CalendarEventFeed.class);				
			}
	        System.out.println("All events on your calendar:");
	        for (CalendarEventEntry entry : resultFeed.getEntries()) {
		          System.out.println("\t" + entry.getTitle().getPlainText());
		    }
*/
	        
		} catch (AuthenticationException e) {
			e.printStackTrace();
		} catch (MalformedURLException e) {
			e.printStackTrace();
		} catch (ServiceException e) {
			e.printStackTrace();
		} catch (IOException e) {
			e.printStackTrace();
		} catch (Exception e) {
			e.printStackTrace();
		}
	}
}
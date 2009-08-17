/*  gCalBirthdays.js
 *
 *  Shared JavaScript functions for HTML and Gadget Version of gCalBirthdays
 *
 *  Copyright (c) 2009 Frank Glaser
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/* Restrictions on GData JavaScript Client 1.10:
 * - The JavaScript client libraries don't yet support Contacts Data API Version 3.
 *     v2 has no birthday fields
 *     v2 has no support for structured name and postal address
 *     v2 no support for retrieving system groups
 * - Batch operations are not supported by the JavaScript client library.
 *
 * InternetExplorer JScript 5.6 Compatibility
 * - use var instead of const
 * - use for(;;) loop instead of for each (element in array) loop
 */

    // Variables
    var contactService;
    var calendarService;

    /**
     * Service setup function.
     */
    function setupService(){
      // ContactsService v3 GoogleService WorkAround for Contact Birthdays
      contactService = new google.gdata.client.GoogleService('cp', APP_NAME);

      // CalendarService v2
      calendarService = new google.gdata.calendar.CalendarService(APP_NAME);
    }

    /**
     * Query groups and calendars function.
     */
    function queryData() {
      queryGroups();
      queryCalendars();
    }

    /**
     * Initial query functions.
     */
    function queryGroups(){
      printConsole('Query Groups');

      // Query for all the contacts entry with this contact group
      var query = new google.gdata.contacts.ContactQuery(GROUP_FEED_URL_THIN);

      // Use query parameter to set the google contacts version
      query.setParam(CONTACTS_VERSION_NAME, CONTACTS_VERSION_NUMBER);

      // Submit the request using the contacts service object
      contactService.getFeed(query, handleGroupsFeed, handleError);
    }

    function getGroups(groupURL){
      // ContactsService v3 GoogleService WorkAround
      contactService.getFeed(groupURL, handleGroupsFeed, handleError);
    }

    function queryCalendars(){
      printConsole('Query Calendars');

      // Query for all calendars
      var query = new google.gdata.client.Query(CALENDAR_FEED_URL_FULL);

      // Submit the request using the calendar service object
      calendarService.getOwnCalendarsFeed(query, handleCalendarsFeed, handleError);
    }

    function getCalendars(calendarURL){
      // Submit the request using the calendar service object
      calendarService.getEventsFeed(calendarURL, handleCalendarsFeed, handleError);
    }

    /**
     * Insert calendar function.
     */
    function insertCalendar(calendarName){
      printConsole('Add calendar: ' + calendarName);

      // Create an instance of CalendarEntry, representing the new calendar
      var calendarEntry = new google.gdata.calendar.CalendarEntry();

      // Set the calendar title
      calendarEntry.setTitle(google.gdata.Text.create(calendarName));

      // Set the calendar summary
      calendarEntry.setSummary(google.gdata.Text.create(CALENDAR_SUMMARY));

      // Set the color that represent this calendar in the Google
      // Calendar UI
      var color = new google.gdata.calendar.ColorProperty();
      color.setValue(CALENDAR_COLOR);
      calendarEntry.setColor(color);

      // Set the calendar to be visible in the Google Calendar UI
      var hidden = new google.gdata.calendar.HiddenProperty();
      hidden.setValue(CALENDAR_HIDDEN);
      calendarEntry.setHidden(hidden);

      // Set the calendar to be selected in the Google Calendar UI
      var selected = new google.gdata.calendar.SelectedProperty()
      selected.setValue(CALENDAR_SELECTED);
      calendarEntry.setSelected(selected);

      // The callback method that will be called after a
      // successful insertion from insertEntry()
      var insertCalendarCallback = function(result){
        printConsole('Calendar added: ' + html_entity_decode(result.entry.getTitle().getText()));
        var elSelId = selectInsertOption('calendarSelectID', result.entry.getTitle().getText(), result.entry.getLink().href);
        selectSetSelectedIndex('calendarSelectID', elSelId);
      }
      // Submit the request using the calendar service object
      calendarService.insertEntry(CALENDAR_FEED_URL_FULL, calendarEntry, insertCalendarCallback, handleError, google.gdata.calendar.CalendarEntry);
    }

    /**
     * Sync query functions.
     */
    function queryContacts(groupId){
      printConsole('Query Contacts');

      // Query for all the contacts entry with this contact group
      var query = new google.gdata.client.Query(CONTACTS_FEED_URL_THIN);

      // Use query parameter to set the google contacts version
      query.setParam(CONTACTS_VERSION_NAME, CONTACTS_VERSION_NUMBER);

      // No groupId - get all contacts
      if ('' != groupId) {
        // Use query parameter to set the groupId
        query.setParam('group', groupId);
      }

      // Set max results per query / items per page
      query.setParam('max-results', MAX_RESULT);

      // ContactsService v3 GoogleService WorkAround
      contactService.getFeed(query, handleContactsFeed, handleError);
    }

    function getContacts(contactURL){
      // ContactsService v3 GoogleService WorkAround
      contactService.getFeed(contactURL, handleContactsFeed, handleError);
    }

    function queryEvents(calendarURL){
      printConsole('Query Events');

      // Query for all the events entry within given calendarid
      var query = new google.gdata.calendar.CalendarEventQuery(calendarURL);

      // Set max results per query / items per page
      query.setMaxResults(MAX_RESULT);

      // Submit the request using the calendar service object
      calendarService.getEventsFeed(query, handleEventsFeed, handleError);
    }

    function getEvents(eventURL){
      // Submit the request using the calendar service object
      calendarService.getEventsFeed(eventURL, handleEventsFeed, handleError);
    }

    /**
     * Event functions.
     */
    function insertEvent(postURL, contact, date){
      var eventEntry = setEvent(new google.gdata.calendar.CalendarEventEntry(), contact, date);

      // The callback method that will be called after a
      // successful insertion from insertEntry()
      var insertEventCallback = function(result){
        printConsole('Event added: ' + html_entity_decode(result.entry.title.$t));
      }
      calendarService.insertEntry(postURL, eventEntry, insertEventCallback, handleError, google.gdata.calendar.CalendarEventEntry);
    }

    function updateEvent(eventEntry, contact, date){
      var eventEntry = setEvent(eventEntry, contact, date);

      // The callback method that will be called after a
      // successful update from updateEntry()
      var updateEventCallback = function(result){
        printConsole('Event updated: ' + html_entity_decode(result.entry.title.$t));
      }
      eventEntry.updateEntry(updateEventCallback, handleError)
    }

    function setEvent(eventEntry, contact, date){
      // Create a recurring event

      // Set the title of the event
      // Insert contact title and content
      // Build date string
      var stringDate;
      if (8 == date.length) {
        // YYYYMMDD -> DD.MM.YYYY
        stringDate = date[6] + date[7] + '.' + date[4] + date[5] + '.' + date[0] + date[1] + date[2] + date[3];
      }
      else {
        // MMDD -> DD.MM.
        stringDate = date[2] + date[3] + '.' + date[0] + date[1] + '.';

        // (RFC 2445 http://www.ietf.org/rfc/rfc2445.txt)
        // To comply with Java long date
        // (http://java.sun.com/j2se/1.3/docs/api/java/util/Date.html#Date(long))
        date = '1970' + date;
        printConsole('Date set year 1970!');
      }
      eventEntry.setTitle(google.gdata.Text.create(htmlentities(contact.title + EVENT_TITLE_SUFFIX + ' (Born ' + stringDate + ')')));
      eventEntry.setContent(google.gdata.Text.create(EVENT_SUMMARY_SUFFIX));

      // Set the calendar time zone
      // Set the calendar location
      // Set show me as to available or busy

      // Set up the recurring details using an ical string
      var recurrence = new google.gdata.Recurrence();
      var recurrenceString = 'DTSTART;VALUE=DATE:' + date + ICAL_BREAK +
                   'DTEND;VALUE=DATE:' + date + ICAL_BREAK +
                   'RRULE:FREQ=YEARLY';
      recurrence.setValue(recurrenceString);
      eventEntry.setRecurrence(recurrence);

      // Create a Reminder object that will be attached to the
      var reminder = new google.gdata.Reminder();
      reminder.setDays(REMINDER_DAYS);
      reminder.setMethod(google.gdata.Reminder.METHOD_ALERT);
      eventEntry.addReminder(reminder);

      return eventEntry;
    }

    /**
     * HTML Select helper functions.
     */
    function selectSetSelectedIndex(id, selId){
      var elSel = document.getElementById(id);
      elSel.selectedIndex = selId>0 ? selId : 0;
    }

    function selectSetSizeOptions(id, selSize){
      var elSel = document.getElementById(id);
      if ( null == selSize ) {
        selSize = elSel.length;
      }
      elSel.size = selSize>0 ? selSize : 0;
    }

    function selectClearOptions(id){
      document.getElementById(id).length = 0;
    }

    function selectInsertOption(id, text, value){
      var elSel = document.getElementById(id);
      var elSelId;
      var len = elSel.length;
      for (elSelId = 0; elSelId < len; elSelId++) {
        var option = elSel.options[elSelId];
        if (0 < compareStrings(option.text, text)) {
          break;
        }
        else if (NEW_CALENDAR == option.text) {
          break;
        }
      }
      return selectAddOption(id, text, value, elSelId);
    }

    function selectAddOption(id, text, value, elSelId){
      var elSel = document.getElementById(id);
      var elOptNew = document.createElement('option');
      elOptNew.text = text;
      elOptNew.value = value;
      try {
        // standards compliant; doesn't work in IE
        var elOptOld = elSel.options[elSelId];
        elSel.add(elOptNew, elOptOld);
      }
      catch (ex) {
        // IE only
        elSel.add(elOptNew, elSelId);
      }
      return elSelId;
    }

    /**
     * Compare helper functions.
     */
    function compareNumbers(a, b){
      return a - b;
    }

    function compareStrings(a, b){
      return (b < a) - (a < b);
    }

    function compareEntries(a, b){
      return compareStrings(a.title.$t.toLowerCase(), b.title.$t.toLowerCase());
    }

    /**
     * This function is called if an error is encountered while
     * retrieving a feed or adding an event.
     */
    function handleError(e){
      // Warnings
    if (NOTDEF != e.message) {
      if (-1 != e.message.search(/Invalid JSON format/i)) {
          // Query is not interrupted!
        printConsole('Warning: ' + e.message);
      }
    }
    // Errors
    else {
      printConsole('Error message:    ' + e.message);
      printConsole('Error fileName:   ' + e.fileName);
      printConsole('Error lineNumber: ' + e.lineNumber);
      if (NOTDEF != typeof e.cause) {
        printConsole('Error cause:      ' + e.cause ? e.cause.statusText : e.message);
      }
      //printConsole('Error stack:      'e.stack);
      }
    };
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

    // Constants
    var GROUP_FEED_URL_THIN = 'http://www.google.com/m8/feeds/groups/default/thin';
    var GROUP_FEED_URL_FULL = 'http://www.google.com/m8/feeds/groups/default/full'; //not used

    var CALENDAR_FEED_URL_FULL = 'http://www.google.com/calendar/feeds/default/owncalendars/full';

    var CONTACTS_FEED_URL_THIN = 'http://www.google.com/m8/feeds/contacts/default/thin';
    var CONTACTS_FEED_URL_FULL = 'http://www.google.com/m8/feeds/contacts/default/full'; //not used
    var CONTACTS_FEED_URL_BASE = 'http://google.com/m8/feeds/groups/user%40gmail.com/base'; //not used

    var CONTACTS_VERSION_NAME = 'v';
    var CONTACTS_VERSION_NUMBER = '3.0';

    var CALENDAR_NAME = 'Birthdays'; // "Geburtstage";
    var CALENDAR_SUMMARY = 'This calendar contains the birthdays of Your Google Contacts.';
    var CALENDAR_COLOR = '#A32929'; // red "#A32929", blue "#2952A3" and green "#0D7813"

    var EVENT_TITLE_SUFFIX = ' Birthday Celebration';
    var EVENT_SUMMARY_SUFFIX = 'Created by gCalBirthdays';

    var CALENDAR_HIDDEN = false;
    var CALENDAR_SELECTED = true;

    var DATE_FORMAT_CONTACTS = 'yyyy-MM-dd';
    var DATE_FORMAT_CALENDAR = 'yyyyMMdd';
    var DATE_FORMAT_YEAR = 'yyyy';

    var ICAL_BREAK = '\r\n'; // '\n'

    var REMINDER_DAYS = 14;

    var MAX_RESULT = 10;

    // Variables
    var contactService;
    var calendarService;

    // Shared Variables
    var groupList = new Array();
    var calendarList = new Array();
    var contactList = new Array();
    var eventList = new Array();
    var postURL;

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
    function queryGroupsAndCalendars() {
      groupList = new Array();
      calendarList = new Array();

      handleGroupsFeed.state = 0;
      handleCalendarsFeed.state = 0;

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

    function handleGroupsFeed(feedRoot){
      var groupFeed = feedRoot.feed;
      var groups = groupFeed.entry;

      // Replace 'System Group: ' with an identifier
      var id = 0;
      // IE JScript 5.6 Compatibility
      var len = groups.length;
      for (var ie = 0; ie < len; ie++) {
        var group = groups[ie];
        group.title.$t = group.title.$t.replace(/System Group/gi, id++);
      }
      // Sort groups
      groups.sort(compareEntries);
      // Remove identifier
      // IE JScript 5.6 Compatibility
      for (var ie = 0; ie < len; ie++) {
        var group = groups[ie];
        group.title.$t = group.title.$t.replace(/^.: /gi, '');
      }

      // Iterate through the array of contact groups, and add them to
      // drop down box
      // IE JScript 5.6 Compatibility
      var idl = groupList.length;
      for (var ie = 0; ie < len; ie++) {
        var group = groups[ie];
        groupList[idl++] = { title: html_entity_decode(group.title.$t), id: group.id.$t };
      }

      // Get next page if it exists
      if (NOTDEF != typeof groupFeed.link[5]) {
        // link[5].rel = 'next'
        var nextURL = groupFeed.link[5].href;
        printConsole('Group NextURL: ' + nextURL);
        return getGroups(nextURL);
      }

      // Next step: show groups
      showGroups(0);
      showSettingsBlock(states.fingroups);
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

    function handleCalendarsFeed(feedRoot){
      var calFeed = feedRoot.feed;
      var calendars = calFeed.getEntries();
      alert(calFeed.getTotalResults().$t);
      // Sort calendars
      calendars.sort(compareEntries);

      // Iterate through the array of calendars, and add them to drop down box
      var i = 0;
      var selId = -1;
      // IE JScript 5.6 Compatibility
      var idl = calendarList.length;
      var len = calendars.length;
      for (var ie = 0; ie < len; ie++) {
        var calendar = calendars[ie];
        calendarList[idl++] = { title: html_entity_decode(calendar.getTitle().getText()), url: calendar.getLink().href };

        // Select first calendar which contains
        // [Birthdays|Geburtstag]
        if (NOTDEF != calendar.getTitle()) {
          if (NOTDEF != calendar.getTitle().getText()) {
            if (-1 != calendar.getTitle().getText().search(/(Birthday|Geburtstag)/i)) {
              if (-1 == selId) {
                selId = i;
              }
            }
          }
        }
        i++;
      }

      // Get next page if it exists
      if (NOTDEF != typeof calFeed.link[5]) {
        // link[5].rel = 'next'
        var nextURL = calFeed.link[5].href;
        printConsole('Calendars NextURL: ' + nextURL);
        return getCalendars(nextURL);
      }

      // Next step: show calendars
      showCalendars(selId);
      showSettingsBlock(states.fincalendars);
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
     * Query contacts and events function.
     */
    function queryContactsAndEvents(groupId, calendarURL) {
      contactList = new Array();
      eventList = new Array();

      handleContactsFeed.state = 0;
      handleEventsFeed.state = 0;

      queryContacts(groupId);
      queryEvents(calendarURL);
    }

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

    function handleContactsFeed(feedRoot){
      var conFeed = feedRoot.feed;
      var contacts = conFeed.entry;
      var contactsLen = (NOTDEF != typeof contacts) ? contacts.length : 0;
      handleContactsFeed.state = handleContactsFeed.state + contactsLen;
      printConsole('Contact(s) query state: ' + handleContactsFeed.state + '/' + conFeed.openSearch$totalResults.$t);

      // IE JScript 5.6 Compatibility
      if (NOTDEF != typeof contacts) {
        var idl = contactList.length;
        for (var ie = 0; ie < contactsLen; ie++) {
          var contact = contacts[ie];
          // Push only if contact has a title
          if (NOTDEF != typeof contact.title.$t) {
            // Push only if contact has a birthday
            if (NOTDEF != typeof contact.gContact$birthday) {
              // Complete push is not necessary becasue we need only the title and birthday
              contactList[idl++] = { title: html_entity_decode(contact.title.$t), birthday: contact.gContact$birthday.when };
            }
          }
        }
      }

      // Check statemachine
      if (states.canceled == statemachine) {
        printConsole('handleContactsFeed: ' + 'canceled');
        return;
      }

      // Get next page if it exists
      if (NOTDEF != typeof conFeed.link[5]) {
        // link[5].rel = 'next'
        var nextURL = conFeed.link[5].href;
        printConsole('Contact NextURL: ' + nextURL);
        return getContacts(nextURL);
      }

      printConsole ('Contact(s) with Birthday: ' + contactList.length);
      if (0 == contactList.length) {
        onclickStop();
        return;
      }

      // Next step: Check events
      showContacts();
      checkBirthdays(states.fincontacts);
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


    function handleEventsFeed(feedRoot){
      var eventFeed = feedRoot.feed;
      var events = eventFeed.entry;
      var eventsLen = events.length;
      handleEventsFeed.state = handleEventsFeed.state + eventsLen;
      printConsole('Event(s) query state: ' + handleEventsFeed.state + '/' + eventFeed.getTotalResults().$t);

      // IE JScript 5.6 Compatibility
      if (NOTDEF != typeof events) {
        for (var ie = 0; ie < eventsLen; ie++) {
          var event = events[ie];
          // Push only if event has a title
          if (NOTDEF != typeof event.getTitle()) {
            // Push only if event has content
            if (NOTDEF != typeof event.getContent()) {
              if (NOTDEF != typeof event.getContent().getText()) {
                // Push only if event is created by us
                if (-1 != event.getContent().getText().search(APP_NAME)) {
                  // Complete push is necessary becasue we need the whole event content
                  event.setTitle(google.gdata.Text.create(html_entity_decode(event.getTitle().getText())));
                  eventList.push(event);
                }
              }
            }
          }
        }
      }

      // Check statemachine
      if (states.canceled == statemachine) {
        printConsole('handleEventsFeed: ' + 'canceled');
        return;
      }

      // Get next page if it exists
      if (NOTDEF != typeof eventFeed.getNextLink()) {
        return getEvents(eventFeed.getNextLink().href);
      }

      // Get URL to post/add events
      // link[2].rel = 'http://schemas.google.com/g/2005#post'
      postURL = eventFeed.getEntryPostLink().href;
      printConsole('Event PostURL: ' + postURL);

      printConsole('Event(s) with Birthday: ' + eventList.length);

      // Next step: Check events
      showEvents();
      checkBirthdays(states.finevents);
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
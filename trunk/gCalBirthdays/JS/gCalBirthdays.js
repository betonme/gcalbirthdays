/*  gCalBirthdays.js
 *
 *  This is version: 1.24
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

/* Restrictions on GData JavaScript Client 2.20:
 * - The JavaScript client libraries don't yet support Contacts Data API Version 3.
 * - Batch operations are not supported by the JavaScript client library.
 *
 * InternetExplorer JScript 5.6 Compatibility
 * - use var instead of const
 * - use for(;;) loop instead of for each (element in array) loop
 */

    // Constants
    var APP_NAME = 'gCalBirthdays';

    var GOOGLE_FEED_AUTH = 'http://www.google.com/m8/feeds/ http://www.google.com/calendar/feeds/';

    var GROUP_FEED_URL_THIN = 'http://www.google.com/m8/feeds/groups/default/thin';
    var GROUP_FEED_URL_FULL = 'http://www.google.com/m8/feeds/groups/default/full'; //not used

//TEST
//var feedUri = 'http://www.google.com/calendar/feeds/default/allcalendars/full';
    var CALENDAR_FEED_URL_FULL = 'http://www.google.com/calendar/feeds/default/owncalendars/full';
    var CALENDAR_FEED_URL_THIN = 'http://www.google.com/calendar/feeds/default/owncalendars/thin';

    var CONTACTS_FEED_URL_THIN = 'http://www.google.com/m8/feeds/contacts/default/thin';
    var CONTACTS_FEED_URL_FULL = 'http://www.google.com/m8/feeds/contacts/default/full'; //not used
    var CONTACTS_FEED_URL_BASE = 'http://google.com/m8/feeds/groups/user%40gmail.com/base'; //not used

    var VERSION_PARAMETER = 'v';
    var CONTACTS_VERSION_NUMBER = '3.0';
    var CALENDAR_VERSION_NUMBER = '2.0';

    var CALENDAR_NAME = 'Birthdays'; // "Geburtstage";
    var CALENDAR_SUMMARY = 'This calendar contains the birthdays of Your Google Contacts.';
    var CALENDAR_COLOR = '#A32929'; // red "#A32929", blue "#2952A3" and green "#0D7813"

    var CALENDAR_HIDDEN = false;
    var CALENDAR_SELECTED = true;

    var ALL_CONTACTS = 'All contacts';

    var DATE_FORMAT_CONTACTS = 'yyyy-MM-dd';
    var DATE_FORMAT_CALENDAR = 'yyyyMMdd';
    var DATE_FORMAT_YEAR = 'yyyy';

    var GROUP_SEPARATOR = ',';
    var MAX_RESULT = 10;

    var EVENT_TEMPLATE_TITLE = '{TITLE}';
    var EVENT_TEMPLATE_BIRTHDAY = '{BIRTHDAY}';

    var EVENT_TITLE_DEFAULT = EVENT_TEMPLATE_TITLE + ' Birthday Celebration (Born ' + EVENT_TEMPLATE_BIRTHDAY + ')';
    var EVENT_SUMMARY_DEFAULT = 'Created by gCalBirthdays';

    var REMINDER_DAYS_DEFAULT = 14;
    var ICAL_BREAK = '\r\n'; // '\n'

    var BOXIMAGE = 'http://gcalbirthdays.googlecode.com/svn/trunk/gCalBirthdays/Images/percentImage.png';
    var BARIMAGE = 'http://gcalbirthdays.googlecode.com/svn/trunk/gCalBirthdays/Images/percentImage_back.png';

    // Variables
    var contactService;
    var calendarService;
    var contactsProgressbar;
    var eventsProgressbar;
    var transferProgressbar;
    var postURL;
    var reminderNumber;
    var reminderType;
    var reminderPopup;
    var reminderEmail;
    var titleText;
    var summaryText;

    // Arrays
    var groupList = new Array();
    var calendarList = new Array();
    var contactList = new Array();
    var eventList = new Array();

    // Shared Constants
    var states = {setup:{}, fingroups:{}, fincalendars:{}, fincontacts:{}, finevents:{}, started:{}, canceled:{}, finished:{}};

    // Shared Variables
    var statemachine = states.setup;


    /**
     * Service setup function.
     */
    function setupService(){
      // ContactsService v3
      contactService = new google.gdata.contacts.ContactsService(APP_NAME);

      // CalendarService v2
      calendarService = new google.gdata.calendar.CalendarService(APP_NAME);

      // setup progress bars
      contactsProgressbar = new JS_BRAMUS.jsProgressBar(
        $('contactsprogressbar'),
        0,
        {
          animate   : true,
          showText  : true,
          width     : 120,
          boxImage  : BOXIMAGE,
          barImage  : BARIMAGE,
          height    : 12,
        }
      );
      eventsProgressbar = new JS_BRAMUS.jsProgressBar(
        $('eventsprogressbar'),
        0,
        {
          animate   : true,
          showText  : true,
          width     : 120,
          boxImage  : BOXIMAGE,
          barImage  : BARIMAGE,
          height    : 12,
        }
      );
      transferProgressbar = new JS_BRAMUS.jsProgressBar(
        $('transferprogressbar'),
        0,
        {
          animate   : true,
          showText  : true,
          width     : 120,
          boxImage  : BOXIMAGE,
          barImage  : BARIMAGE,
          height    : 12,
        }
      );

      setReminderNumber(REMINDER_DAYS_DEFAULT);
      setTitleText(EVENT_TITLE_DEFAULT);
      setSummaryText(EVENT_SUMMARY_DEFAULT);
    }

    /**
     * AuthSub is only used by the html version.
     */
    function useAuthSub(){
      // Do nothing - authsub is the default
    }

    /**
     * OAuth is only used by the gadget version.
     */
    function useOAuth(){
      contactService.useOAuth(APP_NAME);
      calendarService.useOAuth(APP_NAME);
    }

    /**
     * Query groups and calendars function.
     */
    function queryGroupsAndCalendars() {
      groupList = new Array();
      calendarList = new Array();

      handleGroupsFeed.progress = 0;
      handleCalendarsFeed.progress = 0;

      // Set default values
      // Default reminder: is set on init
      // Default group: all contacts is selected automatically
      // Default calendar: first birthday calendar is selected automatically

      queryGroups();
      queryCalendars();
    }

    /**
     * Initial query functions.
     */
    function queryGroups(){
      printConsole('Query Groups');

      // Query for all the contacts entry with this contact group
      //TEST
      //var query = new google.gdata.contacts.ContactQuery(GROUP_FEED_URL_THIN);
      var query = new google.gdata.client.Query(GROUP_FEED_URL_THIN);

      // Use query parameter to set the google contacts version
      query.setParam(VERSION_PARAMETER, CONTACTS_VERSION_NUMBER);

      // Set max results per query / items per page
      //TODO
      //query.setParam('max-results', MAX_RESULT);

      // Submit the request using the contacts service object
      contactService.getContactGroupFeed(query, handleGroupsFeed, handleError);
    }

    function getGroups(groupURL){
      // Submit the request using the contacts service object
      contactService.getContactGroupFeed(groupURL, handleGroupsFeed, handleError);
    }

    function handleGroupsFeed(response){
      if (response.oauthApprovalUrl) {
        handleOAuth(response.oauthApprovalUrl);
      }
      else {
        var groupFeed = response.feed;
        var groups = groupFeed.entry;
        var groupsLen = (undefined != groups) ? groups.length : 0;
        handleGroupsFeed.progress = handleGroupsFeed.progress + groupsLen;

        // Iterate through the array of contact groups, and add them to drop down box
        var idl = groupList.length;
        // IE JScript 5.6 Compatibility
        var len = groups.length;
        for (var ie = 0; ie < len; ie++) {
          var group = groups[ie];
          groupList[idl++] = { title: group.getTitle().getText(), id: group.getId().getValue() };
        }

        // Replace 'System Group: ' with an identifier
        var id = 0;
        // IE JScript 5.6 Compatibility
        var len = groupList.length;
        for (var ie = 0; ie < len; ie++) {
          groupList[ie].title = groupList[ie].title.replace(/System Group/gi, id++);
        }

        // Set progress
        var results = (undefined != groupFeed.getTotalResults()) ? groupFeed.getTotalResults().getValue() : handleGroupsFeed.progress;
        //TODO
        //setProgressContacts(calcProgress(handleContactsFeed.progress, parseInt(conFeed.getTotalResults().getValue())));
        printConsole('Group(s) query progress: ' + handleGroupsFeed.progress + ' / ' + results);

        // Check statemachine
        //TODO
        //if (states.canceled == statemachine) {
        //  printConsole('handleContactsFeed: ' + 'canceled');
        //  return;
        //}

        // Get next page if it exists
        //if (undefined != groupFeed.getNextLink) {
        //  return getGroups(groupFeed.getNextLink().getHref());
        //}
        var len = groupFeed.link.length;
        for (var il = 0; il < len; il++) {
          var link = groupFeed.link[il];
          if ( 'next' == link.rel ) {
            return getGroups(link.getHref());
          }
        }

        // Sort groups
        groupList.sort(compareListEntries);

        // Remove identifier
        // IE JScript 5.6 Compatibility
        var len = groupList.length;
        for (var ie = 0; ie < len; ie++) {
          groupList[ie].title = groupList[ie].title.replace(/^.: /gi, '');
        }

        printConsole ('Group(s): ' + groupList.length);
        printGroups();
        //TODO
//         if (0 == contactList.length) {
//           setProgressContacts(100, true);
//           setProgressEvents(100, true);
//           setProgressTransfer(100, true);
//           printConsole('Cancel no birthdays');
//           statemachine = states.canceled;
//           printConsole('StateMachine: ' + 'canceled');
//           endTransfer();
//           return;
//         }

        // Next step: show groups
        showGroups(0);
        showSettingsSection(states.fingroups);
      }
    }

    function printGroups(){
      // IE JScript 5.6 Compatibility
      var grplist = groupList;
      var len = grplist.length;
      for (var ie = 0; ie < len; ie++) {
        printConsole('Group: ' + grplist[ie].title);
      }
    }

    function showGroups(selId){
      // Clear options
      selectClearOptions('groupselect');

      // Add all contacts option
      selectAddOption('groupselect', ALL_CONTACTS, '');

      // Iterate through the array of contact groups, and add them to
      // drop down box
      // IE JScript 5.6 Compatibility
      var len = groupList.length;
      for (var ie = 0; ie < len; ie++) {
        var group = groupList[ie];
        selectAddOption('groupselect', group.title, group.id);
      }

      // Set selection and size
      selectSetSelectedIndex('groupselect', selId);
      selectSetSizeOptions('groupselect');
    }

    function queryCalendars(){
      printConsole('Query Calendars');

      // Query for own calendars
      var query = new google.gdata.client.Query(CALENDAR_FEED_URL_FULL);

      // Use query parameter to set the google contacts version
      query.setParam(VERSION_PARAMETER, CALENDAR_VERSION_NUMBER);

      // Set max results per query / items per page
      //TODO
      //query.setMaxResults(MAX_RESULT);
      query.setParam('max-results', 10);

      // Submit the request using the calendar service object
      calendarService.getOwnCalendarsFeed(query, handleCalendarsFeed, handleError);
    }

    function getCalendars(calendarURL){
      // Submit the request using the calendar service object
      calendarService.getOwnCalendarsFeed(calendarURL, handleCalendarsFeed, handleError);
    }

    function handleCalendarsFeed(response){
      if (response.oauthApprovalUrl) {
        handleOAuth(response.oauthApprovalUrl);
      }
      else {
        var calFeed = response.feed;
        var calendars = calFeed.getEntries();
        var calendarsLen = calendars.length;
        handleCalendarsFeed.progress = handleCalendarsFeed.progress + calendarsLen;

        // Iterate through the array of calendars, and add them to drop down box
        // IE JScript 5.6 Compatibility
        var idl = calendarList.length;
        var len = calendars.length;
        for (var ie = 0; ie < len; ie++) {
          var calendar = calendars[ie];
          calendarList[idl++] = { title: calendar.getTitle().getText(), url: calendar.getLink().getHref() };
        }

        // Set progress
        var results = (undefined != calFeed.getTotalResults()) ? calFeed.getTotalResults().getValue() : handleCalendarsFeed.progress;
        //TODO
        //setProgressEvents(calcProgress(handleEventsFeed.progress, parseInt(eventFeed.getTotalResults().getValue())));
        printConsole('Calendar(s) query progress: ' + handleCalendarsFeed.progress + ' / ' + results);

        // Check statemachine
        //TODO
//         if (states.canceled == statemachine) {
//           printConsole('handleEventsFeed: ' + 'canceled');
//           return;
//         }

        // Get next page if it exists
        //if ('undefined' != typeof(calFeed.getNextLink)) {
        //  return getCalendars(calFeed.getNextLink().getHref());
        //}
        var len = calFeed.link.length;
        for (var il = 0; il < len; il++) {
          var link = calFeed.link[il];
          if ( 'next' == link.rel ) {
            return getCalendars(link.getHref());
          }
        }

        // Sort calendars
        calendarList.sort(compareListEntries);

        // Select first calendar which contains [Birthday|Geburtstag]
        var selId = -1;
        // IE JScript 5.6 Compatibility
        var len = calendarList.length;
        for (var ie = 0; ie < len; ie++) {
          if (-1 != calendarList[ie].title.search(/(Birthday|Geburtstag)/i)) {
            if (-1 == selId) {
              selId = ie;
              break;
            }
          }
        }

        printConsole ('Calendar(s): ' + calendarList.length);
        printCalendars();

        // Next step: show calendars
        showCalendars(selId);
        showSettingsSection(states.fincalendars);
      }
    }

    function printCalendars(){
      // IE JScript 5.6 Compatibility
      var lcallist = calendarList;
      var len = lcallist.length;
      for (var ie = 0; ie < len; ie++) {
        printConsole('Calendar: ' + lcallist[ie].title);
      }
    }

    function showCalendars(selId){
      // Clear options
      selectClearOptions('calendarselect');

      // Iterate through the array of contact groups, and add them to
      // drop down box
      // IE JScript 5.6 Compatibility
      var len = calendarList.length;
      for (var ie = 0; ie < len; ie++) {
        var calendar = calendarList[ie];
        selectAddOption('calendarselect', calendar.title, calendar.url);
      }

      // Set selection and size
      selectSetSelectedIndex('calendarselect', selId);
      selectSetSizeOptions('calendarselect');
    }

    function showSettingsSection(state){
      // Wait for both queries (queryGroups/queryCalendars) finished
      // Both select boxes (groupselect/calendarselect) are filled
      if ( states.fingroups == state) {
        showSettingsSection.groups = true;
      }
      if ( states.fincalendars == state) {
        showSettingsSection.calendars = true;
      }

      if (showSettingsSection.groups && showSettingsSection.calendars) {
        showOneSection('settings');
      }
    }

    /**
     * Only numbers are allowed for the reminder input.
     */
    function onkeypressReminder(e)
    {
      e = e || window.event;
      var keynum = e.keyCode || e.which;

      // alert (keynum + ", " + e.shiftKey + ", ");

      // Check if key is control character
      if(keynum<48 && !e.shiftKey && !e.altKey && !e.ctrlKey)
      {
        return true;
      }

      // alert (keynum + ", " + e.shiftKey + ", " + keychar);

      // Check if key is digit
      var keychar = String.fromCharCode(keynum);
      var keycharcheck = /\d/;
      return keycharcheck.test(keychar);
    }

    function onchangeReminder(x)
    {
      var y=document.getElementById(x).value;
      document.getElementById(x).value=parseInt(y);
    }

    /**
     * On click create button:
     * Input box for new calendar.
     */
    function onclickCreate(){
      var calendarName = prompt("Calendar name:", "Birthdays");
      if (calendarName != null && calendarName != "") {
        insertCalendar(calendarName);
      }
      else {
        selectSetSelectedIndex('calendarselect', 0);
      }
    }

    /**
     * Insert calendar function.
     */
    function insertCalendar(calendarName){
      printConsole('Add calendar: ' + calendarName);

      // Create an instance of CalendarEntry, representing the new calendar
      var calendarEntry = new google.gdata.calendar.CalendarEntry();

      // Set the calendar title
      calendarEntry.setTitle(google.gdata.atom.Text.create(calendarName));

      // Set the calendar summary
      calendarEntry.setSummary(google.gdata.atom.Text.create(CALENDAR_SUMMARY));

      // Set the calendar timezone
      /*var timeZone = new google.gdata.calendar.TimeZoneProperty();
      timeZone.setValue('America/Los_Angeles');
      calendarEntry.setTimeZone(timeZone);/*

      // Set the calendar location
      /*var where = new google.gdata.Where();
      where.setLabel('Mountain View, CA');
      where.setValueString('Mountain View, CA');
      calendarEntry.addLocation(where);*/

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
        printConsole('Calendar added: ' + result.entry.getTitle().getText());

        //verify name
        if (0 != result.entry.getTitle().getText().search(calendarName))
        {
          printConsole('Rename calendar');
          updateCalendar(result.entry, calendarName);
        }

        var elSelId = selectInsertOption('calendarselect', result.entry.getTitle().getText(), result.entry.getLink().getHref());
        selectSetSelectedIndex('calendarselect', elSelId);
      }
      // Submit the request using the calendar service object
      calendarService.insertEntry(CALENDAR_FEED_URL_FULL, calendarEntry, insertCalendarCallback, handleError, google.gdata.calendar.CalendarEntry);
    }

    function updateCalendar(calendarEntry, calendarName){
      // Update the calendar's title
      calendarEntry.setTitle(google.gdata.atom.Text.create(calendarName));

      var updateCalendarCallback = function(result){
        printConsole('Calendar updated: ' + result.entry.getTitle().getText());

        var elSelId = selectInsertOption('calendarselect', result.entry.getTitle().getText(), result.entry.getLink().getHref());
        selectSetSelectedIndex('calendarselect', elSelId);
      }

      // Submit the request using the calendar service object
      //calendarEntry.updateEntry(CALENDAR_FEED_URL_FULL, calendarEntry, updateCalendarCallback, handleError, google.gdata.calendar.CalendarEntry);
      calendarEntry.updateEntry(updateCalendarCallback, handleError);
    }

    /**
     * Query user contacts and events.
     * The queries are processed parallel,
     * they were transfered within transferBirthdays.
     * Compare both:
     *  - Update outdated events
     *  - Insert missing events
     */
    function queryContactsAndEvents() {
      contactList = new Array();
      eventList = new Array();

      handleContactsFeed.progress = 0;
      handleEventsFeed.progress = 0;

      transferBirthdays.contacts = false;
      transferBirthdays.events = false;

      statemachine = states.started;
      printConsole('StateMachine: ' + 'started');

      resetProgress();

      // Retrieve Contacts
      var elSelGroup = $('groupselect');
      var groupId = new Array();
      // Get all selected groups
      if (0 == elSelGroup.selectedIndex) {
        // GroupId == All contacts
        printConsole('Query Contacts from: ' + elSelGroup.options[elSelGroup.selectedIndex].text);
        groupId[0] = elSelGroup.options[elSelGroup.selectedIndex].value;
      }
      else {
        // GroupId != All contacts
        var len = elSelGroup.length;
        for (var gid=0,elSelId=0; elSelId < len; elSelId++) {
          if (elSelGroup.options[elSelId].selected) {
            printConsole('Query Contacts from: ' + elSelGroup.options[elSelId].text);
            groupId[gid++] = elSelGroup.options[elSelId].value;
          }
        }
      }
      queryContacts(groupId.join(GROUP_SEPARATOR));

      // Retrieve Events
      var elSelCalendar = $('calendarselect');
      printConsole('Query Events from: ' + elSelCalendar.options[elSelCalendar.selectedIndex].text);
      var calendarURL = elSelCalendar.options[elSelCalendar.selectedIndex].value;
      queryEvents(calendarURL);
    }

    function queryContacts(groupId){
      printConsole('Query Contacts');

      groupId = cleanupURL(groupId);

      // Query for all the contacts entry with this contact group
      var query = new google.gdata.client.Query(CONTACTS_FEED_URL_THIN);

      // Use query parameter to set the google contacts version
      query.setParam(VERSION_PARAMETER, CONTACTS_VERSION_NUMBER);

      // No groupId - get all contacts
      if ('' != groupId) {
        // Use query parameter to set the groupId
        query.setParam('group', groupId);
      }

      // Set max results per query / items per page
      //query.setParam('max-results', MAX_RESULT);

      // Submit the request using the contacts service object
      contactService.getContactFeed(query, handleContactsFeed, handleError);
    }

    function getContacts(contactURL){
      // Submit the request using the contacts service object
      contactService.getContactFeed(contactURL, handleContactsFeed, handleError);
    }

    function handleContactsFeed(response){
      if (response.oauthApprovalUrl) {
        handleOAuth(response.oauthApprovalUrl);
      }
      else {
        var conFeed = response.feed;
        var contacts = conFeed.entry;
        var contactsLen = (undefined != contacts) ? contacts.length : 0;
        handleContactsFeed.progress = handleContactsFeed.progress + contactsLen;

        // IE JScript 5.6 Compatibility
        if (undefined != contacts) {
          var idl = contactList.length;
          for (var ie = 0; ie < contactsLen; ie++) {
            var contact = contacts[ie];
            // Push only if contact has a title
            if (undefined != contact.getTitle()) {
              // Push only if contact has a birthday
              if (undefined != contact.getBirthday()) {
                // Complete push is not necessary because we need only the title and birthday
                //contactList.push(contact);
                contactList[idl++] = { title: contact.getTitle().getText(), birthday: contact.getBirthday().getWhen() };
              }
            }
          }
        }

        // Set progress
        var results = (undefined != conFeed.getTotalResults()) ? conFeed.getTotalResults().getValue() : handleContactsFeed.progress;
        setProgressContacts(calcProgress(handleContactsFeed.progress, parseInt(results)));
        printConsole('Contact(s) query progress: ' + handleContactsFeed.progress + ' / ' + results);

        // Check statemachine
        if (states.canceled == statemachine) {
          printConsole('handleContactsFeed: ' + 'canceled');
          return;
        }

        // Get next page if it exists
        //if (undefined != conFeed.getNextLink) {
        //  return getContacts(conFeed.getNextLink().getHref());
        //}
        var len = conFeed.link.length;
        for (var il = 0; il < len; il++) {
          var link = conFeed.link[il];
          if ( 'next' == link.rel ) {
            return getContacts(link.getHref());
          }
        }

        printConsole ('Contact(s) with Birthday: ' + contactList.length);
        if (0 == contactList.length) {
          setProgressContacts(100, true);
          setProgressEvents(100, true);
          setProgressTransfer(100, true);
          printConsole('Cancel no birthdays');
          statemachine = states.canceled;
          printConsole('StateMachine: ' + 'canceled');
          endTransfer();
          return;
        }

        // Next step: Check events
        printContacts();
        transferBirthdays(states.fincontacts);
      }
    }

    function printContacts(){
      // IE JScript 5.6 Compatibility
      var lconlist = contactList;
      var len = lconlist.length;
      for (var ie = 0; ie < len; ie++) {
        printConsole('Contact: ' + lconlist[ie].title + ' ' + lconlist[ie].birthday);
      }
    }

    function queryEvents(calendarURL){
      printConsole('Query Events');

      calendarURL = cleanupURL(calendarURL);

      // Query for all the events entry within given calendarid
      var query = new google.gdata.calendar.CalendarEventQuery(calendarURL);

      // Use query parameter to set the google contacts version
      query.setParam(VERSION_PARAMETER, CALENDAR_VERSION_NUMBER);

      // Set max results per query / items per page
      //query.setMaxResults(MAX_RESULT);
      //query.setParam('max-results', MAX_RESULT);

      // Submit the request using the calendar service object
      calendarService.getEventsFeed(query, handleEventsFeed, handleError);
    }

    function getEvents(eventURL){
      // Submit the request using the calendar service object
      calendarService.getEventsFeed(eventURL, handleEventsFeed, handleError);
    }


    function handleEventsFeed(response){
      if (response.oauthApprovalUrl) {
        handleOAuth(response.oauthApprovalUrl);
      }
      else {
        var eventFeed = response.feed;
        var events = eventFeed.entry;
        var eventsLen = events.length;
        handleEventsFeed.progress = handleEventsFeed.progress + eventsLen;

        // IE JScript 5.6 Compatibility
        if (undefined != events) {
          for (var ie = 0; ie < eventsLen; ie++) {
            var event = events[ie];
            // Push only if event has a title
            if (undefined != event.getTitle()) {
              // Push only if event has content
              if (undefined != event.getContent()) {
                // Push only if event is created by us
                if (-1 != event.getContent().getText().search(APP_NAME)) {
                  // Complete push is necessary because we need the whole event content
                  event.setTitle(google.gdata.atom.Text.create(event.getTitle().getText()));
                  eventList.push(event);
                }
              }
            }
          }
        }

        // Set progress
        var results = (undefined != eventFeed.getTotalResults()) ? eventFeed.getTotalResults().getValue() : handleEventsFeed.progress;
        setProgressEvents(calcProgress(handleEventsFeed.progress, parseInt(results)));
        printConsole('Event(s) query progress: ' + handleEventsFeed.progress + ' / ' + results);

        // Check statemachine
        if (states.canceled == statemachine) {
          printConsole('handleEventsFeed: ' + 'canceled');
          return;
        }

        // Get next page if it exists
        //if ('undefined' != typeof(eventFeed.getNextLink)) {
        //  return getEvents(eventFeed.getNextLink().getHref());
        //}
        var len = eventFeed.link.length;
        for (var il = 0; il < len; il++) {
          var link = eventFeed.link[il];
          if ( 'next' == link.rel ) {
            return getEvents(link.getHref());
          }
        }

        // Get URL to post/add events
        // link[2].rel = 'http://schemas.google.com/g/2005#post'
        postURL = eventFeed.getEntryPostLink().getHref();
        //printConsole('Event PostURL: ' + postURL);

        printConsole('Event(s) with Birthday: ' + eventList.length);

        // Next step: Check events
        printEvents();
        transferBirthdays(states.finevents);
      }
    }

    function printEvents(){
      // IE JScript 5.6 Compatibility
      var levlist = eventList;
      var len = levlist.length;
      for (var ie = 0; ie < len; ie++) {
        printConsole('Event: ' + levlist[ie].getTitle().getText());
      }
    }

    /**
     * Transfer birthdays:
     *  Compare contacts and events:
     *  - Add new birthdays
     *  - Update wrong birthdays
     *  - Skip correct birthdays
     */
    function transferBirthdays(state){

      // Wait for both queries (queryContacts/queryEvents) finished
      // Both lists (contactList/eventList) are filled
      if ( states.fincontacts == state) {
        transferBirthdays.contacts = true;
      }
      if ( states.finevents == state) {
        transferBirthdays.events = true;
      }

      if (transferBirthdays.contacts && transferBirthdays.events) {

        var lconlist = contactList;
        var levlist = eventList;
        var progress = 0;

        // Get reminder variables
        reminderNumber = getReminderNumber();
        reminderType = getReminderType();
        reminderPopup = getReminderPopup();
        reminderEmail = getReminderEmail();
        titleText = getTitleText();
        summaryText = getSummaryText();

        var exists = false;
        // IE JScript 5.6 Compatibility
        if (undefined != lconlist) {
          var lencon = lconlist.length;
          for (var iec = 0; iec < lencon; iec++) {
            var contact = lconlist[iec];
            if (states.canceled == statemachine) {
              printConsole('handleEventsFeed: ' + 'canceled');
              return;
            }
            exists = false;

            // Replace - in birthday string e.g. 01.01.----
            var date = contact.birthday.replace(/-/g, '');

            // IE JScript 5.6 Compatibility
            if (undefined != levlist) {
              var lenev = levlist.length;
              for (var iee = 0; iee < lenev; iee++) {
                var event = levlist[iee];

                if (states.canceled == statemachine) {
                  printConsole('handleEventsFeed: ' + 'canceled');
                  return;
                }

                // Search for contact title
                if (-1 != event.getTitle().getText().search(contact.title)) {
                  exists = true;

                  // Event found for given contact
                  // Check date
                  if (-1 != event.getRecurrence().getValue().search(date)) {
                    // Date correct - do nothing
                    printConsole('Event correct: ' + contact.title);
                    break;
                  }
                  else {
                    // Date not correct - Update event
                    printConsole('Event to update: ' + contact.title);
                    updateEvent(event, contact, date);
                    break;
                  }
                }
              }
            }
            if (false == exists) {
              // Event not found for given contact - Add/Create event
              printConsole('Event to add: ' + contact.title);
              insertEvent(postURL, contact, date);
            }

            // Set progress
            progress++;
            setProgressTransfer(calcProgress(progress, lencon));
            printConsole('Brithday(s) transfer progress: ' + progress + ' / ' + lencon);
          }
        }

        // Finished
        onfinishedSync();
      }
    }

    /**
     * Event functions.
     */
    function insertEvent(postURL, contact, date){
      var eventEntry = setEvent(new google.gdata.calendar.CalendarEventEntry(), contact, date);

      // The callback method that will be called after a
      // successful insertion from insertEntry()
      var insertEventCallback = function(result){
        printConsole('Event added: ' + result.entry.getTitle().getText());
      }
      calendarService.insertEntry(postURL, eventEntry, insertEventCallback, handleError, google.gdata.calendar.CalendarEventEntry);
    }

    function updateEvent(eventEntry, contact, date){
      var eventEntry = setEvent(eventEntry, contact, date);

      // The callback method that will be called after a
      // successful update from updateEntry()
      var updateEventCallback = function(result){
        printConsole('Event updated: ' + result.entry.getTitle().getText());
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
        printInfo('Date: No year specified - set to 1970!');
      }

      var evttitle = titleText;
      evttitle = evttitle.replace(EVENT_TEMPLATE_TITLE, contact.title);
      evttitle = evttitle.replace(EVENT_TEMPLATE_BIRTHDAY, stringDate);
      eventEntry.setTitle(google.gdata.atom.Text.create(evttitle));

      var evtsummary = summaryText;
      evtsummary = evtsummary.replace(EVENT_TEMPLATE_TITLE, contact.title);
      evtsummary = evtsummary.replace(EVENT_TEMPLATE_BIRTHDAY, stringDate);
      eventEntry.setContent(google.gdata.atom.Text.create(evtsummary));

      // Set the calendar time zone
      // Set the calendar location
      // Set show me as to available or busy

      // Set up the recurring details using an ical string
      var recurrenceObj = new google.gdata.Recurrence();
      var recurrenceString = 'DTSTART;VALUE=DATE:' + date + ICAL_BREAK +
                   'DTEND;VALUE=DATE:' + date + ICAL_BREAK +
                   'RRULE:FREQ=YEARLY';
      recurrenceObj.setValue(recurrenceString);
      eventEntry.setRecurrence(recurrenceObj);

      // Set up the Popup Reminder details
      if (reminderPopup){
        var reminderObjAlert = new google.gdata.Reminder();
        if (reminderType == "hour(s)"){
          reminderObjAlert.setHours(reminderNumber);
        }
        else {
          reminderObjAlert.setDays(reminderNumber);
        }
        reminderObjAlert.setMethod(google.gdata.Reminder.METHOD_ALERT);
        eventEntry.addReminder(reminderObjAlert);
      }

      // Set up the Email Reminder details
      if (reminderEmail){
        var reminderObjEmail = new google.gdata.Reminder();
        if (reminderType == "hour(s)"){
          reminderObjEmail.setHours(reminderNumber);
        }
        else {
          reminderObjEmail.setDays(reminderNumber);
        }
        reminderObjEmail.setMethod(google.gdata.Reminder.METHOD_EMAIL);
        eventEntry.addReminder(reminderObjEmail);
      }

      return eventEntry;
    }

    /**
     * HTML Select helper functions.
     */
    function selectSetSelectedIndex(id, selId){
      var elSel = $(id);
      elSel.selectedIndex = selId>0 ? selId : 0;
    }

    function selectGetSelectedIndex(id){
      var elSel = $(id);
      return elSel.selectedIndex;
    }

    function selectSetSelected(id, selId){
      var elSel = $(id);
      if (undefined != elSel) {
        if (elSel.length > selId) {
          elSel.options[selId].selected = true;
        }
      }
    }

    function selectGetSelected(id){
      var elSel = $(id);
      var elSelIds = new Array();
      if (undefined != elSel) {
        var len = elSel.length;
        for (var sId=0,elSelId=0; elSelId < len; elSelId++) {
          if (elSel.options[elSelId].selected) {
            elSelIds[sId++] = elSelId;
          }
        }
      }
      return elSelIds;
    }

    function selectSetSizeOptions(id, selSize){
      var elSel = $(id);
      if ( null == selSize ) {
        selSize = elSel.length;
      }
      if (selSize < 0 ) {
        selSize = 0;
      }
      else if (selSize > 20 ) {
        selSize = 20;
      }
      elSel.size = selSize;
    }

    function selectClearOptions(id){
      $(id).length = 0;
    }

    function selectInsertOption(id, text, value){
      var elSel = $(id);
      var elSelId;
      var len = elSel.length;
      for (elSelId = 0; elSelId < len; elSelId++) {
        var option = elSel.options[elSelId];
        if (0 < compareStrings(option.text, text)) {
          break;
        }
      }
      return selectAddOption(id, text, value, elSelId);
    }

    function selectAddOption(id, text, value, elSelId){
      var elSel = $(id);
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
      a = a.toLowerCase();
      b = b.toLowerCase();
      return (b < a) - (a < b);
    }

    function compareEntries(a, b){
      return compareStrings(a.getTitle().getText(), b.getTitle().getText());
    }

    function compareListEntries(a, b){
      return compareStrings(a.title, b.title);
    }

    /**
     * Query cleanup helper functions.
     */
    function cleanupURL(url) {
      return url.replace(/\?.*/gi,'');
    }

    /**
     * ProgressBar helper functions.
     */

    function resetProgress(){
      setProgressContacts(0, true);
      setProgressEvents(0, true);
      setProgressTransfer(0, true);
    }

    function calcProgress(progress, total){
      total = total>0 ? total : 1;
      progress = progress>0 ? progress : 1;
      return ((progress/total)*100).toFixed(0);
    }

    function setProgressContacts(progress, clear){
      // Check statemachine
      if (states.started == statemachine) {
        contactsProgressbar.setPercentage(progress, clear);
      }
    }

    function setProgressEvents(progress, clear){
      // Check statemachine
      if (states.started == statemachine) {
        eventsProgressbar.setPercentage(progress, clear);
      }
    }

    function setProgressTransfer(progress, clear){
      // Check statemachine
      if (states.started == statemachine) {
        transferProgressbar.setPercentage(progress, clear);
      }
    }

    /**
     * Get the height of an HTMLElement
     * @param {Element} element The element in question.
     * @return {number} The height of that element.
     */
    function nodeHeight(element) {
      if (element.ownerDocument) {
        var box = element.getBoundingClientRect();
        return box.height;
      } else {
        return element.offsetHeight;
      }
    }

    /**
     * Set Get Reminder functions.
     */
    function getReminderNumber(){
      return parseInt($('reminderinput').value, 10);
    }

    function setReminderNumber(rn){
      $('reminderinput').value = parseInt(rn, 10);
    }

    function getReminderType(){
      return $('reminderselect').value;
    }

    function setReminderType(rt){
      $('reminderselect').value = rt;
    }

    function getReminderPopup(){
      return $('popupinput').checked;
    }

    function setReminderPopup(rp){
      $('popupinput').checked = rp;
    }

    function getReminderEmail(){
       return $('emailinput').checked;
    }

    function setReminderEmail(re){
      $('emailinput').checked = re;
    }

    function getTitleText(){
      return $('titleinput').value;
    }

    function setTitleText(tt){
      $('titleinput').value = tt;
    }

    function getSummaryText(){
      return $('summaryinput').value;
    }

    function setSummaryText(st){
      $('summaryinput').value = st;
    }


    /**
     * This function is called if an error is encountered while
     * retrieving a feed or adding an event.
     */
    function handleError(e){
      var warn = false;

      // Warnings
      if (undefined != e.message) {
        if (-1 != e.message.search(/Invalid JSON format/gi)) {
          // Query is not interrupted!
          warn = true;
          printWarn('Warning: ' + e.message);
        }
      }

      // Errors
      if (!warn) {
        var textArray = new Array();
        textArray[0] = 'handleError';
        textArray[1] = 'Error message:    ' + e.message;
        textArray[2] = 'Error fileName:   ' + e.fileName;
        textArray[3] = 'Error lineNumber: ' + e.lineNumber;
        textArray[4] = 'Error cause:      ' + (e.cause!=undefined ? e.cause.statusText : '');
        //textArray[5] = 'Error stack:      ' + e.stack;
        printErrorGroup(textArray);
      }
    };

    /**
     * Print to Firebug Console.
     */
    function printConsole(text){
      printLog(text);
    }

    function printDebug(text){
      try {
        console.debug(text);
      }catch(err) {}
    }

    function printLog(text){
      try {
        console.log(text);
      }catch(err) {}
    }

    function printInfo(text){
      try {
        console.info(text);
      }catch(err) {}
    }

    function printWarn(text){
      try {
        console.warn(text);
      }catch(err) {}
    }

    function printError(text){
      try {
        console.error(text);
      }catch(err) {}
    }

    function printErrorGroup(textArray){
      try {
        console.group(textArray[0]);
        var len = textArray.length;
        for (var i = 1; i < len; i++) {
          console.error(textArray[i]);
        }
        console.groupEnd();
      }catch(err) {}
    }

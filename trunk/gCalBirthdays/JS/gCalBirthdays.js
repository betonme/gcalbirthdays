<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN">

<html>
  <head>
    <title>gCalBirthdays</title>
    <meta http-equiv="content-type" content="text/html; charset=utf-8"/>

    <!--http://code.google.com/p/gdata-javascript-client/-->
    <!--V2.00-->
    <!--http://www.google.com/uds/modules/gdata/gdata.js-->
    <!--<script type="text/javascript" src="http://www.google.com/jsapi"></script>-->
    <script type="text/javascript" src="http://www.google.com/jsapi?autoload=%7Bmodules%3A%5B%7Bname%3Agdata%2Cversion%3A2.x%2Cpackages%3A%5Bcontacts%2Ccalendar%5D%7D%5D%7D"></script>

    <!--http://www.prototypejs.org/-->
    <!--V1.6.0.3-->
    <script src="http://ajax.googleapis.com/ajax/libs/prototype/1.6.0.3/prototype.js"></script>

    <!--http://www.bram.us/projects/js_bramus/jsprogressbarhandler/-->
    <!--V0.3.3-->
    <!--http://www.bram.us/demo/projects/jsprogressbarhandler/js/bramus/jsProgressBarHandler.js-->
    <script type="text/javascript" src="http://gcalbirthdays.googlecode.com/svn/trunk/gCalBirthdays/JS/jsProgressBarHandler.js"></script>

    <!--http://phpjs.org/packages/view/396/name:7d67fb58ff9ab58f4d0e4e55221b50e7/-->
    <!--V2.8.6-->
    <!--http://phpjs.org/packages/download/396/name:html_funcs.min.js-->
    <script type="text/javascript" src="http://gcalbirthdays.googlecode.com/svn/trunk/gCalBirthdays/JS/html_funcs.min.js"></script>

    <!--gCalBirthay Javascript functions for HTML and Gadget Version-->
    <!--V1.16-->
    <script type="text/javascript" src="http://gcalbirthdays.googlecode.com/svn/trunk/gCalBirthdays/JS/gCalBirthdays.js"></script>

    <!--gCalBirthay HTML specific Javascript functions-->
    <script type="text/javascript">

      /*  Copyright (c) 2009 Frank Glaser
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

      //IE JScript 5.6 Compatibility
      // Constants
      var APP_VERSION = '2.05';

      // Tells the google JS lib to call the init function once loaded
      google.setOnLoadCallback(setupHTML);

      /**
       * This function checks if the user is logged in, and changes the
       * login button and displayed sections accordingly.
       * On successful login it calls the main function.
       */
      function setupHTML(){
        var authButton = $('authbutton');
        $('versionID').innerHTML = APP_NAME + ' Version: ' + APP_VERSION;

        var token = google.accounts.user.checkLogin(GOOGLE_FEED_AUTH);
        if (token) {
          // User is loged in
          authButton.value = 'Logout';
          setupService();
          useAuthSub();
          showOneSection('busyloader');
          queryGroupsAndCalendars();
        }
        else {
          // User is loged out
          authButton.value = 'Login';
          showOneSection('loginnotice');
        }
      };

      /**
       * This function is triggered by the login/logout button. If the
       * user is logged in to the app, it logs them out. If the user is
       * logged out to the app, it logs them in.
       */
      function onClickAuthButton(){
        printConsole('Button Auth');

        var token = google.accounts.user.checkLogin(GOOGLE_FEED_AUTH);
        if (token) {
          // User is loged in
          google.accounts.user.logout();
          //TODO
          onclickStop();
        }
        else {
          // User is loged out
          // Use AuthSub Authentication
          token = google.accounts.user.login(GOOGLE_FEED_AUTH);
        }

        setupHTML();
      }

      function onclickStart(){
        printConsole('Button Go');

        $('startbutton').disabled = true;
        $('stopbutton').disabled = false;

        queryContactsAndEvents();
      }

      function onfinishedSync(){
        statemachine = states.finished;
        printConsole('StateMachine: ' + 'finished');
        printConsole('Finished!');
        stopTransfer();
      }

      function onclickStop(){
        printConsole('Button Cancel');
        statemachine = states.canceled;
        printConsole('StateMachine: ' + 'canceled');
        stopTransfer();
      }

      function stopTransfer(){
        $('startbutton').disabled = false;
        $('stopbutton').disabled = true;
      }

      function getPreferences() {
        // nothing is saved in html version
      }

      function showOneSection(toshow) {
        var sections = [ 'loginnotice', 'busyloader', 'settings' ];
        for (var i=0; i < sections.length; ++i) {
          var s = sections[i];
          var el = $(s);
          if (s === toshow) {
            el.style.display = "block";
          } else {
            el.style.display = "none";
          }
        }
      }
    </script>

    <style type="text/css">
      .indent {
        margin: 30px 0px 0px 20px;
      }
      .text {
        color: black;
      }
    </style>

  </head>

  <body>
    <!--Main page-->
    <div id="html" class="indent">
      <img src="gCalBirthdays.gif" alt="gCalBirthdays Logo"> <br>

      <p id="versionID">
          Version:
      </p>

      <p>
          Welcome to gCalBirthdays, an app that transfer Your
          Google Contacts birthdays to Your Google Calendar.
      </p>

      <p id="loginnotice" style="color:#cc0000; font-weight:bold; display:none">
          Because this is a third-party app that uses your Google
          account authentication, you'll need to grant access to
          it by clicking the "Login" button.
      </p>

      <p>
        <input id="authbutton" type="button" value="Authenticate" onclick="onClickAuthButton()">
      </p>

      <div id="busyloader" style="display:none">
        <img src="http://gcalbirthdays.googlecode.com/svn/trunk/gCalBirthdays/Images/busyLoader.gif" alt="BusyLoader Image">
      </div>

      <form id="settings" style="display:none">
        <table cellspacing="0" cellpadding="5">
          <tr>
            <td style="padding-right: 30px">Set Reminder:</td>
            <td>
              <input id="reminderinput" maxlength="2" style="width:30px" onkeypress="return isNumberKey(event)"/>
              day(s)
            </td>
          </tr>
          <tr valign="bottom">
            <td style="padding-right: 30px">Select Group(s):</td>
            <td style="padding-right: 30px">Select Calendar:</td>
          </tr>
          <tr valign="top">
            <td style="padding-right: 30px">
              <select id="groupselect" multiple="multiple" size="4"></select>
            </td>
            <td style="padding-right: 30px">
              <select id="calendarselect" size="1" onchange="changeCalendar()"></select>
            </td>
          </tr>
        </table>
        <br>
        <input id="startbutton" type="button" value="Go" onclick="onclickStart()">
        <input id="stopbutton" type="button" value="Cancel" onclick="onclickStop()" disabled="true">
        <br>
        <br>
        <table>
          <tr>
            <td>Load Contacts:</td>
            <td><span id="contactsprogressbar">0%</span></td>
          </tr>
          <tr>
            <td>Load Events:</td>
            <td><span id="eventsprogressbar" class="progressBar">0%</span></td>
          </tr>
          <tr>
            <td>Transfer Birthdays:</td>
            <td><span id="transferprogressbar" class="progressBar">0%</span></td>
          </tr>
        </table>
      </form>
    </div>

    <!--Google Analytics-->
    <script type="text/javascript">
      var gaJsHost = (("https:" == document.location.protocol) ? "https://ssl." : "http://www.");
      document.write(unescape("%3Cscript src='" + gaJsHost + "google-analytics.com/ga.js' type='text/javascript'%3E%3C/script%3E"));
    </script>
    <script type="text/javascript">
      try {
        var pageTracker = _gat._getTracker("UA-9798979-1");
        pageTracker._trackPageview();
      }
      catch(err) {}
    </script>

  </body>
</html>

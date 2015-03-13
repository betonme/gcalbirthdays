# Hints #

## Google Calendar Gadget Setup ##

Relating: gCalBirthdays V3

Problem: After adding the gadget, the Login or the settings can not

Cause: With the provided URL, the Google Login is not working.

Solution:
  * Add the Gadget: http://www.google.com/calendar/render?gadgeturl=http://gcalbirthdays.googlecode.com/svn/trunk/gCalBirthdays/Gadget/gCalBirthdays.xml
  * Reload Google Calendar: www.google.com/calendar
  * Login
  * Open settings

<br>

<h2>Firefox and NoScript</h2>

Relating: gCalBirthdays V2 and V3<br>
<br>
Problem: Login hangs<br>
<br>
Cause: NoScript blocks the CSS<br>
<br>
Solution:<br>
Disable NoScript<br>
or<br>
change NoScript Settings - Advanced - Cross-Site-Scripting -<br>
Append:<br>
<b><code>^http://gcalbirthdays.googlecode.com\.*</code></b>

<br>

<h2>Revoce access</h2>
<ul><li>Go to <a href='https://accounts.google.com/IssuedAuthSubTokens'>https://accounts.google.com/IssuedAuthSubTokens</a>
</li><li>Search for gCalBirthdays<br>
</li><li>Remove it
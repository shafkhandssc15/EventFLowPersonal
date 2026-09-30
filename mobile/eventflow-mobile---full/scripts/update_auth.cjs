const fs = require('fs');

const file = 'D:/event-management-platform/event-management-platform/web/src/pages/AuthPage.jsx';
let code = fs.readFileSync(file, 'utf8');

const target1 = 'if (userRole !== "Admin" && userRole !== "Attendee") {';
const repl1 = `const isPreApproved = cleanEmail === "organizer.eventflow@gmail.com" || cleanEmail === "vendor.eventflow@gmail.com" || cleanEmail === "admin.eventflow@gmail.com" || cleanEmail === "admin@demo.com" || cleanEmail === "attendee@demo.com";
        if (userRole !== "Admin" && userRole !== "Attendee" && !isPreApproved) {`;

const target2 = 'if (userRole !== "Attendee" && userRole !== "Admin") {';
const repl2 = `const isPreApproved = cleanEmail === "organizer.eventflow@gmail.com" || cleanEmail === "vendor.eventflow@gmail.com" || cleanEmail === "admin.eventflow@gmail.com" || cleanEmail === "admin@demo.com" || cleanEmail === "attendee@demo.com";
        if (userRole !== "Attendee" && userRole !== "Admin" && !isPreApproved) {`;

const target3 = 'if (registeredMatch.role !== "Attendee" && registeredMatch.role !== "Admin" && !registeredMatch.isApproved) {';
const repl3 = `const isPreApproved = cleanEmail === "organizer.eventflow@gmail.com" || cleanEmail === "vendor.eventflow@gmail.com" || cleanEmail === "admin.eventflow@gmail.com" || cleanEmail === "admin@demo.com" || cleanEmail === "attendee@demo.com";
        if (registeredMatch.role !== "Attendee" && registeredMatch.role !== "Admin" && !registeredMatch.isApproved && !isPreApproved) {`;

const target4 = 'const requiresAdminApproval = (role === "Organizer" || role === "VendorVenueManager");';
const repl4 = `const isPreApproved = cleanEmail === "organizer.eventflow@gmail.com" || cleanEmail === "vendor.eventflow@gmail.com" || cleanEmail === "admin.eventflow@gmail.com" || cleanEmail === "admin@demo.com" || cleanEmail === "attendee@demo.com";
      const requiresAdminApproval = (role === "Organizer" || role === "VendorVenueManager") && !isPreApproved;`;

console.log('Matches:', {
  t1: code.includes(target1),
  t2: code.includes(target2),
  t3: code.includes(target3),
  t4: code.includes(target4),
});

if (code.includes(target1) && code.includes(target2) && code.includes(target3) && code.includes(target4)) {
  code = code.replace(target1, repl1);
  code = code.replace(target2, repl2);
  code = code.replace(target3, repl3);
  code = code.replace(target4, repl4);
  fs.writeFileSync(file, code, 'utf8');
  console.log('Successfully updated AuthPage.jsx!');
}

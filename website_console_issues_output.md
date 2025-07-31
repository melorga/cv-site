A form field element should have an id or name attribute
A form field element has neither an id nor a name attribute. This might prevent the browser from correctly autofilling the form.
To fix this issue, add a unique id or name attribute to a form field. This is not strictly needed, but still recommended even if you have an autocomplete attribute on the same element.
3 resources
Learn more: The form input element
An element doesn't have an autocomplete attribute
A form field has an id or name attribute that the browser's autofill recognizes. However, it doesn't have an autocomplete attribute assigned. This might prevent the browser from correctly autofilling the form.
To fix this issue, provide an autocomplete attribute.
1 resource
Violating node
Learn more: HTML attribute: autocomplete
Content Security Policy of your site blocks the use of 'eval' in JavaScript`
The Content Security Policy (CSP) prevents the evaluation of arbitrary strings as JavaScript to make it more difficult for an attacker to inject unathorized code on your site.
To solve this issue, avoid using eval(), new Function(), setTimeout([string], ...) and setInterval([string], ...) for evaluating strings.
If you absolutely must: you can enable string evaluation by adding unsafe-eval as an allowed source in a script-src directive.
⚠️ Allowing string evaluation comes at the risk of inline script injection.
1 directive
Source location	Directive	Status
challenges.cloudflar…b53f962&lang=auto:1	script-src	blocked
Learn more: Content Security Policy - Eval
Deprecated feature used
StorageType.persistent is deprecated. Please use standardized navigator.storage instead.
1 source
challenges.cloudflare.com/cdn-cgi/challenge-platform/h/b/orchestrate/chl_api/v1?ray=967f342f4b53f962&lang=auto:1
Learn more: Check the feature status page for more details.
Learn more: This change will go into effect with milestone 106.
Page layout may be unexpected due to Quirks Mode
One or more documents in this page is in Quirks Mode, which will render the affected document(s) with quirks incompatible with the current HTML and CSS specifications.
Quirks Mode exists mostly due to historical reasons. If this is not intentional, you can add or modify the DOCTYPE to be `<!DOCTYPE html>` to render the page in No Quirks Mode.
1 element
Document in the DOM tree	Mode	URL
document	Quirks Mode	https://challenges.cloudflare.com/cdn-cgi/challenge-platform/h/b/turnstile/if/ov2/av0/rcv/rjxyw/0x4AAAAAABm23QDGouB2k8RP/light/fbE/new/normal/auto/
Learn more: Document compatibility mode
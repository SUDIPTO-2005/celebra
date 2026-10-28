from rest_framework.authentication import SessionAuthentication


class CsrfExemptSessionAuthentication(SessionAuthentication):
    """
    SessionAuthentication subclass that relaxes CSRF enforcement for REST API calls.
    Security is enforced via strict CORS origin whitelisting (CORS_ALLOWED_ORIGINS)
    and secure SameSite session cookies.
    """

    def enforce_csrf(self, request):
        # Do not enforce CSRF check on API requests; protected by CORS
        return

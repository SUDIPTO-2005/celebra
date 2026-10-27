from django.contrib import admin

from .models import RSVP, Guest, InviteToken

admin.site.register(Guest)
admin.site.register(RSVP)
admin.site.register(InviteToken)

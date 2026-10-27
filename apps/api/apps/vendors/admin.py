from django.contrib import admin

from .models import Booking, QuoteRequest, Vendor

admin.site.register(Vendor)
admin.site.register(QuoteRequest)
admin.site.register(Booking)

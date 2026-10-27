from django.contrib import admin

from .models import ScheduleItem, Task

admin.site.register(Task)
admin.site.register(ScheduleItem)

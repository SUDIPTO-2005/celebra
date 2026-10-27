from django.contrib import admin

from .models import BudgetCategory, Expense

admin.site.register(BudgetCategory)
admin.site.register(Expense)

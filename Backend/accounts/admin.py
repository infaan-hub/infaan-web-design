from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import CustomUser


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    list_display = ("id", "username", "email", "role", "is_active", "is_staff")
    list_filter = ("role", "is_active", "is_staff")
    search_fields = ("username", "email")
    fieldsets = UserAdmin.fieldsets + (
        ("Infaan Profile", {"fields": ("role", "phone_number")}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ("Infaan Profile", {"fields": ("email", "role", "phone_number")}),
    )

from django.contrib import admin

from account.models import User

# Register your models here.


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ("user_uuid", "email", "username")
    search_fields = ("email", "username")
    readonly_fields = ("user_uuid", "password")

    def has_add_permission(self, request):
        return True

    def has_delete_permission(self, request, obj=None):
        return True

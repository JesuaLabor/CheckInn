from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    ROLE_CHOICES = (
        ('guest', 'Guest'),
        ('staff', 'Inn Staff / Front Desk'),
        ('admin', 'Inn Admin / Owner'),
        ('superadmin', 'Platform Admin'),
    )

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='guest')
    hotel = models.ForeignKey(
        'hotels.Hotel',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='staff_members',
        help_text='The hotel this user is assigned to (null for guests and superadmins).'
    )
    phone_number = models.CharField(max_length=30, blank=True, default='')

    @property
    def is_hotel_staff(self):
        return self.role in ('staff', 'admin') and self.hotel is not None

    @property
    def is_hotel_admin(self):
        return self.role == 'admin' and self.hotel is not None

    def __str__(self):
        hotel_str = f" @ {self.hotel.name}" if self.hotel else ""
        return f"{self.username} ({self.get_role_display()}{hotel_str})"

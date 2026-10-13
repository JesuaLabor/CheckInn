from django.db import models
from django.utils.text import slugify


class Hotel(models.Model):
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True, blank=True)
    tagline = models.CharField(max_length=255, blank=True, default='')
    description = models.TextField(blank=True, default='')
    address = models.CharField(max_length=300)
    city = models.CharField(max_length=100, default='Malaybalay City')
    province = models.CharField(max_length=100, default='Bukidnon')
    country = models.CharField(max_length=2, default='PH', help_text='ISO-3166-1 alpha-2 country code')
    country_name = models.CharField(max_length=100, default='Philippines')
    postal_code = models.CharField(max_length=20, blank=True, default='')
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    currency = models.CharField(max_length=3, default='PHP', help_text='ISO-4217 currency code (PHP, USD, JPY, EUR, etc.)')
    timezone = models.CharField(max_length=50, default='Asia/Manila', help_text='IANA timezone (e.g. Asia/Manila, Asia/Tokyo)')
    category = models.CharField(
        max_length=50,
        default='mountain',
        help_text='Travel style category (beach, mountain, heritage, city, eco)'
    )
    contact_phone = models.CharField(max_length=50, blank=True, default='')
    contact_email = models.EmailField(blank=True, default='')
    image_url = models.URLField(max_length=600, blank=True, default='')
    amenities = models.JSONField(default=list, blank=True)
    rating = models.DecimalField(max_digits=3, decimal_places=1, default=4.5)
    review_count = models.PositiveIntegerField(default=18)
    STATUS_CHOICES = (
        ('pending', 'Pending Approval'),
        ('approved', 'Approved / Live'),
        ('rejected', 'Rejected'),
        ('suspended', 'Suspended'),
    )

    owner = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='owned_hotels',
        help_text='The primary hotel owner / business account.'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='approved')
    rejection_reason = models.TextField(blank=True, default='')
    business_permit_number = models.CharField(max_length=100, blank=True, default='')
    bir_tin = models.CharField(max_length=50, blank=True, default='')
    payout_method = models.CharField(max_length=50, blank=True, default='GCash')
    payout_account_name = models.CharField(max_length=150, blank=True, default='')
    payout_account_number = models.CharField(max_length=100, blank=True, default='')
    commission_rate = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        default=0.10,
        help_text='SaaS platform commission rate (e.g. 0.10 for 10%)'
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.name)
            slug = base_slug
            counter = 1
            while Hotel.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.city})"


class RoomType(models.Model):
    hotel = models.ForeignKey(Hotel, on_delete=models.CASCADE, related_name='room_types')
    name = models.CharField(max_length=150)
    description = models.TextField(blank=True, default='')
    base_rate = models.DecimalField(max_digits=10, decimal_places=2, help_text='Rate per night')
    currency = models.CharField(max_length=3, default='PHP', help_text='ISO-4217 currency code')
    capacity = models.PositiveIntegerField(default=2, help_text='Maximum guests')
    amenities = models.JSONField(default=list, blank=True)
    photos = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['base_rate']

    def __str__(self):
        return f"{self.name} - {self.hotel.name} ({self.currency} {self.base_rate}/night)"


class Room(models.Model):
    STATUS_CHOICES = (
        ('available', 'Available'),
        ('occupied', 'Occupied'),
        ('maintenance', 'Maintenance'),
        ('cleaning', 'Cleaning'),
    )

    hotel = models.ForeignKey(Hotel, on_delete=models.CASCADE, related_name='rooms')
    room_type = models.ForeignKey(RoomType, on_delete=models.CASCADE, related_name='rooms')
    room_number = models.CharField(max_length=50)
    floor = models.CharField(max_length=20, default='1st Floor')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='available')
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ('hotel', 'room_number')
        ordering = ['room_number']

    def __str__(self):
        return f"Room {self.room_number} ({self.room_type.name}) - {self.hotel.name}"

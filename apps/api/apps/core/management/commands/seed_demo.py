"""
Management command to seed repeatable demonstration data for Celebra.
Demo Event: 'Anya\'s 30th Birthday'
Demo Account: demo@celebra.test / CelebraDemo2024!
"""

from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.budget.models import BudgetCategory, Expense
from apps.events.models import Event, EventMember, EventStatus, MemberRole
from apps.guests.models import RSVP, Guest, RSVPResponse
from apps.guests.services import GuestService
from apps.notifications.models import Notification, NotificationType
from apps.tasks.models import ScheduleItem, Task, TaskPriority, TaskStatus
from apps.vendors.models import (
    Booking,
    BookingStatus,
    QuoteRequest,
    QuoteStatus,
    Vendor,
    VendorCategory,
)

User = get_user_model()


class Command(BaseCommand):
    help = "Seed demo event 'Anya\\'s 30th Birthday' with guests, budget, tasks, timeline, and vendors."

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Clear existing demo data before seeding.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write("Seeding Celebra demonstration data...")

        # 1. Demo User
        demo_user, created = User.objects.get_or_create(
            email="demo@celebra.test",
            defaults={
                "first_name": "Anya",
                "last_name": "Sharma",
                "is_active": True,
            },
        )
        demo_user.set_password("CelebraDemo2024!")
        demo_user.save()

        # Co-host user
        cohost_user, _ = User.objects.get_or_create(
            email="cohost@celebra.test",
            defaults={
                "first_name": "Marcus",
                "last_name": "Vance",
                "is_active": True,
            },
        )
        cohost_user.set_password("CelebraDemo2024!")
        cohost_user.save()

        if options["clear"]:
            Event.objects.filter(name="Anya's 30th Birthday").delete()
            Vendor.objects.filter(is_sample_data=True).delete()

        # 2. Sample Vendors
        vendors_data = [
            {
                "name": "The Glasshouse Loft [Sample]",
                "category": VendorCategory.VENUE,
                "description": "Penthouse rooftop venue with panoramic city views and indoor glass pavilion.",
                "contact_email": "events@glasshouseloft.sample",
                "phone": "+1 (555) 234-5678",
            },
            {
                "name": "Artisan Bites & Canapés [Sample]",
                "category": VendorCategory.CATERING,
                "description": "Bespoke seasonal catering featuring artisanal charcuterie, vegetarian tapas, and signature cocktails.",
                "contact_email": "chef@artisanbites.sample",
                "phone": "+1 (555) 345-6789",
            },
            {
                "name": "Lumière Candid Photography [Sample]",
                "category": VendorCategory.PHOTOGRAPHY,
                "description": "Natural light storytelling and photo booth installation with on-site instant prints.",
                "contact_email": "hello@lumierephoto.sample",
                "phone": "+1 (555) 456-7890",
            },
            {
                "name": "Groove Collective Live DJ [Sample]",
                "category": VendorCategory.MUSIC,
                "description": "High-energy vinyl DJ and saxophone duo blending nu-disco, funk, and celebratory anthems.",
                "contact_email": "bookings@groovecollective.sample",
                "phone": "+1 (555) 567-8901",
            },
            {
                "name": "Botanica Floral & Styling [Sample]",
                "category": VendorCategory.FLORIST,
                "description": "Wildflower floral arches, dried floral centerpieces, and warm ambient candle styling.",
                "contact_email": "studio@botanicafloral.sample",
                "phone": "+1 (555) 678-9012",
            },
        ]

        seeded_vendors = {}
        for v_data in vendors_data:
            v_obj, _ = Vendor.objects.get_or_create(
                name=v_data["name"],
                defaults={**v_data, "is_sample_data": True},
            )
            seeded_vendors[v_data["category"]] = v_obj

        # 3. Main Demo Event: "Anya's 30th Birthday"
        now = timezone.now()
        event_start = (now + timedelta(days=21)).replace(
            hour=18, minute=30, second=0, microsecond=0
        )
        event_end = event_start + timedelta(hours=5, minutes=30)

        event, _ = Event.objects.get_or_create(
            name="Anya's 30th Birthday",
            owner=demo_user,
            defaults={
                "description": (
                    "Milestone 30th birthday celebration with close friends, dinner, rooftop music, "
                    "and celebratory cocktails. Theme: Golden Hour Chic."
                ),
                "event_type": "birthday",
                "venue": "The Glasshouse Loft, Downtown Rooftop",
                "start_date": event_start,
                "end_date": event_end,
                "timezone": "America/New_York",
                "budget": Decimal("4500.00"),
                "currency": "USD",
                "status": EventStatus.CONFIRMED,
            },
        )

        # Ensure memberships
        EventMember.objects.get_or_create(
            event=event, user=demo_user, defaults={"role": MemberRole.OWNER}
        )
        EventMember.objects.get_or_create(
            event=event, user=cohost_user, defaults={"role": MemberRole.COHOST}
        )

        # 4. Budget Categories & Expenses
        categories_data = [
            (
                "Venue & Rooftop Rental",
                Decimal("1800.00"),
                [
                    (
                        "Venue reservation deposit (50%)",
                        Decimal("900.00"),
                        date.today() - timedelta(days=5),
                    ),
                ],
            ),
            (
                "Catering & Signature Cocktails",
                Decimal("1400.00"),
                [
                    (
                        "Tapas and canapé deposit",
                        Decimal("500.00"),
                        date.today() - timedelta(days=3),
                    ),
                ],
            ),
            (
                "Photography & Photo Booth",
                Decimal("600.00"),
                [
                    (
                        "Photographer retainer fee",
                        Decimal("300.00"),
                        date.today() - timedelta(days=2),
                    ),
                ],
            ),
            ("DJ & Sound Equipment", Decimal("450.00"), []),
            (
                "Florals & Table Styling",
                Decimal("250.00"),
                [
                    (
                        "Dried floral centerpieces purchase",
                        Decimal("120.00"),
                        date.today() - timedelta(days=1),
                    ),
                ],
            ),
        ]

        for cat_name, est_amount, expenses in categories_data:
            cat, _ = BudgetCategory.objects.get_or_create(
                event=event,
                name=cat_name,
                defaults={"estimated_amount": est_amount},
            )
            for exp_desc, exp_amt, exp_date in expenses:
                Expense.objects.get_or_create(
                    category=cat,
                    description=exp_desc,
                    defaults={
                        "amount": exp_amt,
                        "currency": "USD",
                        "date": exp_date,
                    },
                )

        # 5. Guests & RSVPs & Invite Tokens
        guests_data = [
            (
                "Marcus Vance",
                "marcus.vance@example.test",
                1,
                "Nut allergy",
                "Elevator access",
                RSVPResponse.YES,
                "Can't wait to celebrate! Bringing plus one.",
            ),
            (
                "Elena Rostova",
                "elena.r@example.test",
                0,
                "Vegetarian",
                "",
                RSVPResponse.YES,
                "So excited for the 30th!",
            ),
            (
                "Jordan Lee",
                "jordan.lee@example.test",
                1,
                "Gluten-free",
                "",
                RSVPResponse.YES,
                "Looking forward to seeing everyone.",
            ),
            (
                "Sophia Chen",
                "sophia.chen@example.test",
                0,
                "",
                "",
                RSVPResponse.MAYBE,
                "Checking flight schedules, hope to make it!",
            ),
            (
                "David Kim",
                "david.k@example.test",
                0,
                "",
                "",
                RSVPResponse.NO,
                "Traveling overseas for work, sending love!",
            ),
            ("Maya Patel", "maya.p@example.test", 0, "Vegan", "", None, ""),
            ("Lucas Miller", "lucas.m@example.test", 1, "", "", None, ""),
            ("Chloe Bennett", "chloe.b@example.test", 0, "", "", None, ""),
        ]

        for g_name, g_email, plus_one, dietary, access, rsvp_resp, rsvp_notes in guests_data:
            guest, _ = Guest.objects.get_or_create(
                event=event,
                name=g_name,
                defaults={
                    "email": g_email,
                    "plus_ones": plus_one,
                    "dietary_requirements": dietary,
                    "accessibility_requirements": access,
                },
            )
            if rsvp_resp:
                RSVP.objects.get_or_create(
                    guest=guest,
                    defaults={
                        "response": rsvp_resp,
                        "notes": rsvp_notes,
                    },
                )
            # Create invite token
            if not hasattr(guest, "invite_token") or not guest.invite_token:
                GuestService.generate_invite_token(guest, demo_user)

        # 6. Tasks
        tasks_data = [
            (
                "Finalize cocktail tasting menu",
                "Select 3 signature drinks with catering team",
                TaskPriority.HIGH,
                TaskStatus.COMPLETED,
                event_start - timedelta(days=10),
                demo_user,
            ),
            (
                "Design and send digital invitations",
                "Send personalized RSVP links to all invitees",
                TaskPriority.URGENT,
                TaskStatus.COMPLETED,
                event_start - timedelta(days=14),
                cohost_user,
            ),
            (
                "Confirm DJ playlist & first celebration track",
                "Share Spotify playlist with DJ Groove Collective",
                TaskPriority.MEDIUM,
                TaskStatus.IN_PROGRESS,
                event_start - timedelta(days=5),
                cohost_user,
            ),
            (
                "Order custom birthday cake",
                "Raspberry champagne tiered cake from artisan bakery",
                TaskPriority.HIGH,
                TaskStatus.TODO,
                event_start - timedelta(days=7),
                demo_user,
            ),
            (
                "Assemble welcome guest favors",
                "Golden hour themed gift bags with custom notes",
                TaskPriority.LOW,
                TaskStatus.TODO,
                event_start - timedelta(days=2),
                None,
            ),
            (
                "Confirm final headcount with caterer",
                "Deliver exact dietary constraints and attending count",
                TaskPriority.URGENT,
                TaskStatus.TODO,
                event_start - timedelta(days=3),
                demo_user,
            ),
        ]

        for t_title, t_desc, t_prio, t_stat, t_due, t_assigned in tasks_data:
            Task.objects.get_or_create(
                event=event,
                title=t_title,
                defaults={
                    "description": t_desc,
                    "priority": t_prio,
                    "status": t_stat,
                    "due_date": t_due,
                    "assigned_to": t_assigned,
                    "completed_at": timezone.now() if t_stat == TaskStatus.COMPLETED else None,
                },
            )

        # 7. Timeline / Schedule Items
        schedule_data = [
            (
                "Guest Arrival & Welcome Champagne",
                event_start,
                event_start + timedelta(minutes=45),
                "Live acoustic background playlist; welcome drinks on terrace",
            ),
            (
                "Canapés & Tapas Service",
                event_start + timedelta(minutes=45),
                event_start + timedelta(hours=2),
                "Stationary charcuterie & roving hot skewers",
            ),
            (
                "Toasts & Celebration Speech",
                event_start + timedelta(hours=2),
                event_start + timedelta(hours=2, minutes=30),
                "Marcus and friends toast Anya, cake cutting",
            ),
            (
                "DJ Dance Set & Party",
                event_start + timedelta(hours=2, minutes=30),
                event_start + timedelta(hours=5),
                "DJ Groove Collective live set; photo booth open",
            ),
            (
                "Event Wrap-up & Farewell",
                event_start + timedelta(hours=5),
                event_end,
                "Late night sliders & guest departures",
            ),
        ]

        for s_title, s_start, s_end, s_notes in schedule_data:
            ScheduleItem.objects.get_or_create(
                event=event,
                title=s_title,
                defaults={
                    "start_time": s_start,
                    "end_time": s_end,
                    "timezone": "America/New_York",
                    "notes": s_notes,
                },
            )

        # 8. Vendor Quote and Booking
        venue_vendor = seeded_vendors.get(VendorCategory.VENUE)
        if venue_vendor:
            Booking.objects.get_or_create(
                event=event,
                vendor=venue_vendor,
                defaults={
                    "start_time": event_start - timedelta(hours=2),
                    "end_time": event_end + timedelta(hours=1),
                    "amount": Decimal("1800.00"),
                    "status": BookingStatus.CONFIRMED,
                },
            )

        catering_vendor = seeded_vendors.get(VendorCategory.CATERING)
        if catering_vendor:
            QuoteRequest.objects.get_or_create(
                event=event,
                vendor=catering_vendor,
                defaults={
                    "details": "Cocktail style catering for 30-35 guests with vegetarian and allergy options.",
                    "status": QuoteStatus.CONFIRMED,
                    "quoted_amount": Decimal("1400.00"),
                },
            )

        # 9. Notifications
        notifications_data = [
            (
                demo_user,
                NotificationType.RSVP_UPDATE,
                "New RSVP Received",
                "Elena Rostova responded: Attending (1 guest)",
            ),
            (
                demo_user,
                NotificationType.RSVP_UPDATE,
                "New RSVP Received",
                "Jordan Lee responded: Attending with +1",
            ),
            (
                demo_user,
                NotificationType.TASK_DUE,
                "Upcoming Task Deadline",
                "Task 'Order custom birthday cake' is due in 7 days",
            ),
            (
                demo_user,
                NotificationType.EVENT_UPDATE,
                "Booking Confirmed",
                "The Glasshouse Loft confirmed your rooftop booking reservation",
            ),
        ]

        for u_notif, n_type, n_title, n_msg in notifications_data:
            Notification.objects.get_or_create(
                user=u_notif,
                title=n_title,
                message=n_msg,
                defaults={
                    "event": event,
                    "notification_type": n_type,
                    "is_read": False,
                },
            )

        self.stdout.write(
            self.style.SUCCESS("Successfully seeded 'Anya\\'s 30th Birthday' and demo account!")
        )

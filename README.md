# Anuj.dev: Awwwards-Winning Style Backend Developer Portfolio

A production-ready, dynamic portfolio website built with Python and Django. This project features an extremely premium, Awwwards-style single-page scrolling aesthetic designed specifically for backend engineers and developers. 

It is built as a single-page web application featuring high-performance smooth scrolling (Lenis), robust GSAP animations, dynamic database models, an interactive soft-body physics engine, and an intuitive Django Admin interface for content management.

## Features

- **Awwwards-Style Aesthetic**: A custom premium dark color palette (`#121110`), elegant typography mixing Oswald, Manrope, and JetBrains Mono, and massive display headers.
- **Dynamic Content Management**: Fully integrated Django Admin panel to upload custom profile photos, manage interactive hover images for services, and manage your portfolio deployment cards.
- **Lenis Smooth Scrolling**: Ultra-smooth, inertia-based vertical scrolling using Studio Freight's Lenis library.
- **GSAP Animations**: ScrollTrigger-powered fade-ins, stagger animations, a typewriter effect with a blinking terminal cursor, and a customized 3D mouse hover effect on the title.
- **Soft-Body Physics "Jelly Pet"**: An interactive HTML5 Canvas element featuring node-based spring physics that responds to your mouse dragging and throwing, acting as a fun Easter egg.
- **Dynamic Mouse-Follow Elements**: Custom JavaScript implementing zero-delay `gsap.quickTo` logic for floating service images (Django REST, Database Topology) that strictly appear in designated layout gaps.

## Tech Stack

- **Backend**: Python, Django (MVT Architecture)
- **Database**: SQLite3 (Development)
- **Frontend**: Vanilla HTML5, Custom CSS3, Vanilla JavaScript
- **Libraries**: GSAP (ScrollTrigger), Studio Freight Lenis

## Local Installation

1. **Clone the repository**:
   ```bash
   git clone <YOUR_REPO_URL>
   cd Portfolio_Anuj
   ```

2. **Activate the virtual environment**:
   ```bash
   # On macOS/Linux:
   source venv/bin/activate
   # On Windows:
   venv\Scripts\activate
   ```

3. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Apply Database Migrations**:
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

5. **Create a Superuser (for Admin Access)**:
   ```bash
   python manage.py createsuperuser
   ```

6. **Run the Development Server**:
   ```bash
   python manage.py runserver
   ```
   Navigate to `http://127.0.0.1:8000` to view the site.

## Managing the Portfolio

- **Profile & Hover Images**: Navigate to `http://127.0.0.1:8000/admin/`, go to **Portfolio Settings**, and upload your profile photo or service section hover images directly.
- **Projects**: Add, edit, or delete projects under the **Projects** section in the admin panel to dynamically update the horizontal project grid.

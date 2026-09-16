# Portfolio Showcase: Terminal Precision

A production-ready, dynamic portfolio website built with Python and Django. This project features a sleek, dark-mode "Terminal Precision" aesthetic designed for backend engineers and developers. 

It is built as a multi-page web application featuring custom CSS grid layouts, dynamic database models, interactive JavaScript animations, and an intuitive Django Admin interface for content management.

## Features

- **Dark Mode Aesthetic**: A custom `#0a0d12` to `#11141a` color palette, sleek monospace highlights, and a rounded "app window" layout.
- **Dynamic Content Management**: Fully integrated Django Admin panel to upload custom profile photos and manage portfolio deployment cards.
- **Cyberpunk Hover Effects**: Advanced CSS hover animations on the navigation bar featuring glowing neon drop-shadows and letter-spacing expansion.
- **Interactive Matrix Portrait**: A mathematical JavaScript puzzle animation that shatters the hero image into 16 reactive CSS pieces when clicked.
- **Multi-Page Architecture**: 
  - `/` (About Me): Hero section, statistics, and dynamic interactive portrait.
  - `/portfolio/` (Portfolio): Dynamic project grid driven by a Django `ListView`.
  - `/services/` (Services): 3-column architectural capabilities overview.

## Tech Stack

- **Backend**: Python 3.13, Django 6.1 (MVT Architecture)
- **Database**: SQLite3 (Development)
- **Frontend**: Vanilla HTML5, Custom CSS3, Vanilla JavaScript
- **Image Processing**: Pillow 10.0+

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

- **Profile Photo**: Navigate to `http://127.0.0.1:8000/admin/`, go to **Portfolio Settings**, and upload a new profile photo. The layout and puzzle animation will dynamically adapt to the new image.
- **Projects**: Add, edit, or delete projects under the **Projects** section in the admin panel to update the `/portfolio/` page grid.

## License
MIT License. Feel free to clone, customize, and use this layout f

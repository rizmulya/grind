import { ArrowLeftIcon } from '@heroicons/react/24/outline'

interface Props {
  onBack: () => void
}

export default function LegalPage({ onBack }: Props) {
  return (
    <div className="px-4 py-6 pb-20">
      <div className="mb-6 flex items-center gap-3">
        <button onClick={onBack} className="rounded-full p-1 text-gray-400 hover:bg-gray-100">
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-bold text-gray-900">Legal</h2>
      </div>

      <section className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Terms of Service</h3>
          <p className="mt-2 text-xs leading-relaxed text-gray-500">
            By using Grind ("the App"), you agree to these Terms of Service. If you do not agree,
            do not use the App.
          </p>
        </div>

        <div className="space-y-3 text-xs leading-relaxed text-gray-500">
          <div>
            <h4 className="font-semibold text-gray-700">1. Acceptance of Terms</h4>
            <p>
              By accessing or using Grind, you confirm that you have read, understood, and agree to
              be bound by these terms. We reserve the right to update these terms at any time.
              Continued use after changes constitutes acceptance.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-700">2. Account</h4>
            <p>
              You are responsible for maintaining the confidentiality of your Google account used to
              sign in. You are solely responsible for all activities that occur under your account.
              You must notify us immediately of any unauthorized use.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-700">3. Acceptable Use</h4>
            <p>
              You agree not to misuse the App for any unlawful purpose or in violation of any
              applicable laws. You may not attempt to access another user's data, disrupt the
              service, or use automated means to access the App without authorization.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-700">4. Data</h4>
            <p>
              The App stores habit tracking data you enter. We do not sell, rent, or share your
              personal data with third parties. Your data is stored securely and is only accessible
              to you through your authenticated session.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-700">5. Disclaimer</h4>
            <p>
              The App is provided "as is" without warranty of any kind. We are not responsible for
              any damages arising from the use or inability to use the App. We do not guarantee
              uninterrupted or error-free service.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-700">6. Termination</h4>
            <p>
              We reserve the right to suspend or terminate your access to the App at any time,
              without notice, for conduct that we believe violates these terms or is harmful to
              other users or the service.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-700">7. Contact</h4>
            <p>
              For questions about these terms, please reach out via the developer's GitHub profile.
            </p>
          </div>
        </div>
      </section>

      <hr className="my-6 border-gray-100" />

      <section className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Privacy Policy</h3>
          <p className="mt-2 text-xs leading-relaxed text-gray-500">
            Your privacy is important. This policy explains what data we collect and how we handle it.
          </p>
        </div>

        <div className="space-y-3 text-xs leading-relaxed text-gray-500">
          <div>
            <h4 className="font-semibold text-gray-700">Information We Collect</h4>
            <p>
              <strong>Account Information:</strong> When you sign in with Google, we receive your
              name, email address, and avatar URL from Google. We do not receive your Google
              password.
            </p>
            <p className="mt-1">
              <strong>Habit Data:</strong> We store the habits, logs, targets, and categories you
              create within the App.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-700">How We Use Your Information</h4>
            <p>
              Your data is used solely to provide the App's functionality: displaying your habits,
              tracking your progress, and personalizing your experience. We do not use your data
              for advertising, profiling, or any purpose beyond the App's core features.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-700">Data Storage & Security</h4>
            <p>
              Your data is stored in a PostgreSQL database with row-level security. Each user can
              only access their own data. Authentication is handled by GoTrue (Supabase Auth) which
              issues JWT tokens. All communications are encrypted in transit.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-700">Third-Party Services</h4>
            <p>
              We use Google OAuth for authentication. Google may share your basic profile
              information (name, email, avatar) with us as part of the sign-in process. We do not
              share your data with any other third parties.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-700">Data Retention</h4>
            <p>
              Your data is retained for as long as the database persists. The deployer may
              remove data at any time by truncating or dropping the database.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-700">Your Rights</h4>
            <p>
              You can view, edit, or delete your habits directly through the app interface.
              Since Grind is self-hosted, the deployer has full control over the database
              and can manage all data directly via PostgreSQL.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-700">Changes to This Policy</h4>
            <p>
              We may update this Privacy Policy from time to time. Changes will be posted within
              the App.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-700">Contact</h4>
            <p>
              For privacy-related inquiries, reach out via the developer's GitHub profile.
            </p>
          </div>
        </div>
      </section>

      <p className="mt-6 text-center text-[10px] text-gray-300">Last updated: May 2026</p>
    </div>
  )
}

import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-[calc(100vh-4rem)] py-12">
      <div className="container-width">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <div className="col-span-full max-w-2xl mx-auto w-full">
            <div className="card p-12 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-purple-100 mb-6">
                <svg
                  className="w-10 h-10 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                Have a great idea for a theme?
              </h3>
              <p className="text-gray-600 text-lg mb-8">
                Create your own league and get in on all the fun!
              </p>
              <Link
                href="/leagues/new"
                className="btn-primary"
              >
                Start A New League
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

import { Link } from 'react-router-dom';
import { VisitorRegionNote } from '../../components/VisitorRegionNote';

export function AboutPage() {
  return (
    <div>
      <div className="page-hero">
        <h1>About this app</h1>
        <p className="lede">
          Browse NHL franchise history—moves, names, trophies, and playoff lore. It’s built for reading, not live
          scores.
        </p>
        <VisitorRegionNote style={{ marginTop: '0.75rem' }} />
      </div>

      <div className="card card-pad" style={{ marginBottom: '1rem' }}>
        <h2 className="display" style={{ margin: '0 0 0.5rem' }}>
          Where the numbers come from
        </h2>
        <p style={{ margin: '0 0 0.75rem' }}>
          Teams, seasons, and awards are packaged with the app. When you open a page, you’re reading that packaged
          snapshot—not a live feed from the league.
        </p>
        <p style={{ margin: 0 }}>
          Totals like Cups, finals, and “last won” are calculated from the same history tables you see on each team
          page, so lifetime numbers and “current era” numbers can be compared side by side.
        </p>
        <p style={{ margin: '0.75rem 0 0' }}>
          When a club moves or rebrands, the story usually stays on one franchise page across those chapters, so
          trophies travel with the charter unless the data is intentionally split.
        </p>
      </div>

      <div className="card card-pad" style={{ marginBottom: '1rem' }}>
        <h2 className="display" style={{ margin: '0 0 0.5rem' }}>
          What stays on your device
        </h2>
        <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
          <li>Favorite teams</li>
          <li>Teams you opened recently</li>
          <li>Search, filters, and sort on the franchise list</li>
          <li>Conn Smythe search and filters</li>
          <li>Compare tool picks</li>
          <li>Light or dark theme</li>
          <li>Notes you type on team pages</li>
          <li>Playoff bracket picker settings and last run</li>
        </ul>
        <p className="muted" style={{ margin: '0.75rem 0 0' }}>
          That’s all stored in your browser on this device. Clearing site data for this app will reset it.
        </p>
      </div>

      <div className="card card-pad" style={{ marginBottom: '1rem' }}>
        <h2 className="display" style={{ margin: '0 0 0.5rem' }}>
          Franchises and identities
        </h2>
        <p style={{ margin: 0 }}>
          A <strong>franchise</strong> is the ongoing club—the same charter through relocations and new names. Most
          moves are shown as chapters on one page (for example Nordiques becoming the Avalanche). Rare splits can
          link to a related franchise when the history really forks.
        </p>
      </div>

      <p>
        <Link to="/franchises">Back to franchises</Link>
      </p>
    </div>
  );
}

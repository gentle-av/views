#!/bin/zsh

# Create test structure for Media Center TypeScript project

set -e

autoload colors
colors

PROJECT_ROOT="${1:-.}"

echo "${fg[cyan]}🧪 Creating test structure...${reset_color}"
echo ""

# Create test directories
dirs=(
    "$PROJECT_ROOT/ts/__tests__"
    "$PROJECT_ROOT/ts/__tests__/helpers"
    "$PROJECT_ROOT/ts/__tests__/unit"
    "$PROJECT_ROOT/ts/__tests__/unit/value-objects"
    "$PROJECT_ROOT/ts/__tests__/unit/models"
    "$PROJECT_ROOT/ts/__tests__/unit/services"
    "$PROJECT_ROOT/ts/__tests__/unit/api"
    "$PROJECT_ROOT/ts/__tests__/unit/utils"
    "$PROJECT_ROOT/ts/__tests__/integration"
    "$PROJECT_ROOT/ts/__tests__/e2e"
    "$PROJECT_ROOT/ts/__tests__/mocks"
)

for dir in $dirs; do
    mkdir -p "$dir"
    echo "  ✓ Created: ${dir#$PROJECT_ROOT/}"
done

# Create test files
echo ""
echo "${fg[yellow]}📝 Creating test files...${reset_color}"

# setup.ts
cat > "$PROJECT_ROOT/ts/__tests__/setup.ts" << 'EOF'
import { afterEach, beforeEach } from 'vitest';

// Global test setup
beforeEach(() => {
  console.log('🧪 Test started');
});

afterEach(() => {
  // Cleanup after each test
});
EOF
echo "  ✓ Created: __tests__/setup.ts"

# helpers/test-utils.ts
cat > "$PROJECT_ROOT/ts/__tests__/helpers/test-utils.ts" << 'EOF'
export const cleanup = (): void => {
  // Cleanup function
};

export const createTempFile = (name: string): string => {
  return `/tmp/test-${Date.now()}-${name}`;
};

export const randomString = (length: number = 10): string => {
  return Math.random().toString(36).substring(2, length + 2);
};

export const expectThrow = (fn: () => void, errorMessage: string): void => {
  let threw = false;
  try {
    fn();
  } catch (e) {
    threw = true;
    if (e instanceof Error) {
      expect(e.message).toContain(errorMessage);
    }
  }
  expect(threw).toBe(true);
};

export const wait = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};
EOF
echo "  ✓ Created: __tests__/helpers/test-utils.ts"

# mocks/api-mock.ts
cat > "$PROJECT_ROOT/ts/__tests__/mocks/api-mock.ts" << 'EOF'
import { ApiResponse } from '../../types/api';

export const mockApiResponse = <T = any>(data: T, success: boolean = true): ApiResponse<T> => ({
  success,
  data,
});

export const mockErrorResponse = (error: string = 'Network error'): ApiResponse => ({
  success: false,
  error,
});

export const mockFetch = (response: any, ok: boolean = true): void => {
  global.fetch = vi.fn().mockResolvedValue({
    ok,
    json: async () => response,
    text: async () => JSON.stringify(response),
  });
};
EOF
echo "  ✓ Created: __tests__/mocks/api-mock.ts"

# Value objects tests
cat > "$PROJECT_ROOT/ts/__tests__/unit/value-objects/FilePath.test.ts" << 'EOF'
import { describe, it, expect } from 'vitest';
import { FilePath } from '../../../models/value-objects/FilePath.js';

describe('FilePath', () => {
  it('should create valid file path', () => {
    const path = new FilePath('/mnt/video/movie.mp4');
    expect(path.getValue()).toBe('/mnt/video/movie.mp4');
  });

  it('should throw error on empty path', () => {
    expect(() => new FilePath('')).toThrow('File path cannot be empty');
  });

  it('should extract file name', () => {
    const path = new FilePath('/mnt/video/test.mp4');
    expect(path.getFileName()).toBe('test.mp4');
  });

  it('should extract extension', () => {
    const path = new FilePath('/mnt/video/video.mkv');
    expect(path.getExtension()).toBe('mkv');
  });

  it('should detect video files', () => {
    expect(new FilePath('/test.mp4').isVideo()).toBe(true);
    expect(new FilePath('/test.txt').isVideo()).toBe(false);
  });
});
EOF
echo "  ✓ Created: __tests__/unit/value-objects/FilePath.test.ts"

cat > "$PROJECT_ROOT/ts/__tests__/unit/value-objects/Duration.test.ts" << 'EOF'
import { describe, it, expect } from 'vitest';
import { Duration } from '../../../models/value-objects/Duration.js';

describe('Duration', () => {
  it('should create duration from seconds', () => {
    const duration = new Duration(125);
    expect(duration.getSeconds()).toBe(125);
  });

  it('should throw error on negative duration', () => {
    expect(() => new Duration(-5)).toThrow('Duration cannot be negative');
  });

  it('should format duration', () => {
    const duration = new Duration(125);
    expect(duration.format()).toBe('2:05');
  });

  it('should format duration with hours', () => {
    const duration = new Duration(3665);
    expect(duration.format()).toBe('1:01:05');
  });

  it('should create zero duration', () => {
    const zero = Duration.zero();
    expect(zero.getSeconds()).toBe(0);
  });
});
EOF
echo "  ✓ Created: __tests__/unit/value-objects/Duration.test.ts"

cat > "$PROJECT_ROOT/ts/__tests__/unit/value-objects/TrackNumber.test.ts" << 'EOF'
import { describe, it, expect } from 'vitest';
import { TrackNumber } from '../../../models/value-objects/TrackNumber.js';

describe('TrackNumber', () => {
  it('should create track number', () => {
    const track = new TrackNumber(5);
    expect(track.getValue()).toBe(5);
  });

  it('should throw error on invalid number', () => {
    expect(() => new TrackNumber(0)).toThrow('Track number must be at least 1');
    expect(() => new TrackNumber(1000)).toThrow('Track number cannot exceed 999');
  });

  it('should format with padding', () => {
    expect(new TrackNumber(5).format()).toBe('05');
    expect(new TrackNumber(12).format()).toBe('12');
  });
});
EOF
echo "  ✓ Created: __tests__/unit/value-objects/TrackNumber.test.ts"

cat > "$PROJECT_ROOT/ts/__tests__/unit/value-objects/Volume.test.ts" << 'EOF'
import { describe, it, expect } from 'vitest';
import { Volume } from '../../../models/value-objects/Volume.js';

describe('Volume', () => {
  it('should create volume', () => {
    const vol = new Volume(75);
    expect(vol.getValue()).toBe(75);
  });

  it('should throw error on invalid volume', () => {
    expect(() => new Volume(-1)).toThrow('Volume must be between 0 and 100');
    expect(() => new Volume(101)).toThrow('Volume must be between 0 and 100');
  });

  it('should increase volume', () => {
    const vol = new Volume(50);
    expect(vol.increase(10).getValue()).toBe(60);
  });

  it('should decrease volume', () => {
    const vol = new Volume(50);
    expect(vol.decrease(10).getValue()).toBe(40);
  });

  it('should not exceed 100', () => {
    const vol = new Volume(95);
    expect(vol.increase(10).getValue()).toBe(100);
  });

  it('should not go below 0', () => {
    const vol = new Volume(5);
    expect(vol.decrease(10).getValue()).toBe(0);
  });

  it('should create default volume', () => {
    expect(Volume.default().getValue()).toBe(50);
  });
});
EOF
echo "  ✓ Created: __tests__/unit/value-objects/Volume.test.ts"

cat > "$PROJECT_ROOT/ts/__tests__/unit/value-objects/ArtistName.test.ts" << 'EOF'
import { describe, it, expect } from 'vitest';
import { ArtistName } from '../../../models/value-objects/ArtistName.js';

describe('ArtistName', () => {
  it('should create artist name', () => {
    const artist = new ArtistName('The Beatles');
    expect(artist.getValue()).toBe('The Beatles');
  });

  it('should normalize whitespace', () => {
    const artist = new ArtistName('  The  Beatles  ');
    expect(artist.getValue()).toBe('The Beatles');
  });

  it('should throw error on empty name', () => {
    expect(() => new ArtistName('')).toThrow('Artist name cannot be empty');
  });

  it('should get first letter', () => {
    expect(new ArtistName('The Beatles').getFirstLetter()).toBe('T');
  });

  it('should match search term', () => {
    const artist = new ArtistName('The Beatles');
    expect(artist.matches('beatles')).toBe(true);
    expect(artist.matches('queen')).toBe(false);
  });

  it('should create unknown artist', () => {
    expect(ArtistName.unknown().getValue()).toBe('Unknown Artist');
  });
});
EOF
echo "  ✓ Created: __tests__/unit/value-objects/ArtistName.test.ts"

# Simple test to verify setup works
cat > "$PROJECT_ROOT/ts/__tests__/simple.test.ts" << 'EOF'
import { describe, it, expect } from 'vitest';

describe('Test setup', () => {
  it('should pass basic test', () => {
    expect(1 + 1).toBe(2);
  });
});
EOF
echo "  ✓ Created: __tests__/simple.test.ts"

echo ""
echo "${fg[green]}✅ Test structure created!${reset_color}"
echo ""
echo "${fg[cyan]}📊 Statistics:${reset_color}"
file_count=$(find "$PROJECT_ROOT/ts/__tests__" -type f -name "*.ts" 2>/dev/null | wc -l | xargs)
echo "  📁 Test files: $file_count"
echo ""
echo "${fg[yellow]}🚀 Run tests:${reset_color}"
echo "  npm run test        # Watch mode"
echo "  npm run test:run    # Single run"
echo "  npm run test:ui     # UI mode"
echo ""

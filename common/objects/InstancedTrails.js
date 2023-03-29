import { BufferGeometry, BufferAttribute, LineSegments, Vector3 } from 'three';

const _vec = new Vector3();

export class InstancedTrails extends LineSegments {

	constructor( trailCount, segmentCount, material ) {

		const geometry = new BufferGeometry();
		const posArr = new Float32Array( trailCount * segmentCount * 2 * 3 );
		const alphaArr = new Float32Array( trailCount * segmentCount * 2 );
		geometry.setAttribute( 'position', new BufferAttribute( posArr, 3, false ) );
		geometry.setAttribute( 'alpha', new BufferAttribute( alphaArr, 1, false ) );
		geometry.setAttribute( 'creationMs', new BufferAttribute( new Uint32Array( trailCount * segmentCount * 2 ), 1, false ) );

		super( geometry, material );

		this.totalSegments = trailCount * segmentCount;
		this.previousSegments = new Uint32Array( trailCount );
		this.nextSegment = 0;
		this.rolledOver = false;

	}

	_getField( attr, segment, isStart = false, target = null ) {

		const offset = segment * 2 + ( isStart ? 0 : 1 );
		if ( attr.itemSize === 1 ) {

			return attr.getX( offset );

		} else {

			return target.fromBufferAttribute( attr, offset );

		}

	}

	_setField( attr, segment, isStart, value ) {

		const offset = segment * 2 + ( isStart ? 0 : 1 );
		const itemSize = attr.itemSize;
		if ( itemSize === 1 ) {

			attr.setX( offset, value );

		} else if ( itemSize === 2 ) {

			attr.setXY( offset, value.x, value.y );

		} else if ( itemSize === 3 ) {

			attr.setXYZ( offset, value.x, value.y, value.z );

		} else {

			attr.setXYZW( offset, value.x, value.y, value.z, value.w );

		}

	}

	init( index, v ) {

		const { geometry, previousSegments } = this;
		const { position } = geometry.attributes;

		const nextSeg = this.nextSegment;
		previousSegments[ index ] = nextSeg;
		this._setField( position, nextSeg, false, v );
		this._setField( position, nextSeg, true, v );
		this._incrementNextSegment();

	}

	pushPoint( index, point, breakTrail = false ) {

		// const {
		// 	alpha = 1,
		// 	point,
		// } = info;

		const alpha = 1;
		const { geometry, previousSegments } = this;
		const {
			position: posAttr,
			alpha: alphaAttr,
			creationMs: creationAttr,
		} = geometry.attributes;

		const nextSeg = this.nextSegment;
		const currTime = window.performance.now();
		if ( breakTrail ) {

			this._setField( posAttr, nextSeg, true, point );
			this._setField( alphaAttr, nextSeg, true, alpha );
			this._setField( creationAttr, nextSeg, true, currTime );

		} else {

			const prevSeg = previousSegments[ index ];
			const prevPos = this._getField( posAttr, prevSeg, false, _vec );
			const prevAlpha = this._getField( alphaAttr, prevSeg, false );
			const prevMs = this._getField( creationAttr, prevSeg, false );

			this._setField( posAttr, nextSeg, true, prevPos );
			this._setField( alphaAttr, nextSeg, true, prevAlpha );
			this._setField( creationAttr, nextSeg, true, prevMs );

		}

		this._setField( posAttr, nextSeg, false, point );
		this._setField( alphaAttr, nextSeg, false, alpha );
		this._setField( creationAttr, nextSeg, false, currTime );

		previousSegments[ index ] = nextSeg;
		this._incrementNextSegment();

	}

	_incrementNextSegment() {

		const { totalSegments, geometry } = this;
		const posAttr = geometry.attributes.position;
		const updateRange = posAttr.updateRange;

		if ( updateRange.count === - 1 ) {

			if ( this.rolledOver ) {

				updateRange.offset = 0;
				updateRange.count = 3;
				this.rolledOver = false;

			} else {

				updateRange.offset = this.nextSegment * 2 * 3;
				updateRange.count = 3;

			}

		}

		this.nextSegment ++;
		if ( this.nextSegment >= totalSegments || this.rolledOver ) {

			this.rolledOver = true;

		} else {

			updateRange.count = this.nextSegment * 2 * 3 - updateRange.offset;

		}

		this.nextSegment = ( this.nextSegment ) % totalSegments;

		const {
			alpha: alphaAttr,
			creationMs: creationAttr,
		} = geometry.attributes;

		this._setUpdateRange( posAttr, updateRange.offset, updateRange.count );
		this._setUpdateRange( alphaAttr, updateRange.offset / 3, updateRange.count / 3 );
		this._setUpdateRange( creationAttr, updateRange.offset / 3, updateRange.count / 3 );


	}

	_setUpdateRange( attr, offset, count ) {

		attr.updateRange.offset = offset;
		attr.updateRange.count = count;
		attr.needsUpdate = true;

	}

}

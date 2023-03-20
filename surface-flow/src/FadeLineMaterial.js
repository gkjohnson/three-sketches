import { Color } from 'three';
import { MaterialBase } from '../../common/MaterialBase.js';

export class FadeLineMaterial extends MaterialBase {

    constructor( params ) {

        super( {

            uniforms: {

                color: { value: new Color() },
                opacity: { value: 1 },
                maxIndex: { value: 10 },

            },


			vertexShader: /* glsl */`

                attribute uint lifeIndex;
                varying float vLifeIndex;
                void main() {

                    vec4 mvPosition = vec4( position, 1.0 );
                    mvPosition = modelViewMatrix * mvPosition;
                    gl_Position = projectionMatrix * mvPosition;
                    vLifeIndex = float( lifeIndex );

                }

            `,

            fragmentShader: /* glsl */`

                uniform vec3 color;
                uniform float opacity;
                uniform float maxIndex;
                varying float vLifeIndex;

                void main() {

                    gl_FragColor.rgb = color;
                    gl_FragColor.a = opacity * ( ( maxIndex - vLifeIndex ) / ( maxIndex - 1.0 ) );

                }

            `,

        } )

        this.setValues( params );

    }

}
